using System.Reflection;
using QuestPDF.Drawing;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PPS.LicenseManager.API.Services;

/*
 * Renders a single Purchase Requisition as a professional,
 * compliance-oriented procurement document - header/status watermark,
 * Request Information, Business Justification, Item/Service Details,
 * Technical Specification, Vendor Information, Commercial Summary
 * (with amount in words), Approval History, Finance/Procurement Action,
 * Supporting Documents, and a document-control footer on every page.
 *
 * Generated on final approval (see
 * PurchaseRequisitionService.GenerateAndStorePdfAsync) and lazily
 * (re)generated on download if missing (see GetPdfFileAsync), and stored
 * outside wwwroot so it's reachable only through the authenticated
 * GET /api/PurchaseRequisition/{id}/pdf endpoint - never as a bare
 * static file URL the way attachments are.
 *
 * The caller is responsible for loading every navigation this class
 * reads (Company, Department, RequestedByUser, InitiatedByContact,
 * Vendor, LineItems, Attachments.UploadedByUser,
 * ApprovalSteps.AssignedApproverUser/AssignedApproverContact,
 * PreviousRevision, PoUploadedByUser) - see PurchaseRequisitionService's
 * private Query() method, which already includes all of them.
 *
 * Every field this class prints comes straight from what's already
 * stored - it never recomputes or "corrects" a Quantity/UnitPrice/
 * LineTotal/Subtotal/Tax/Total value (those are always server-computed
 * at write time, see PurchaseRequisitionService.ValidateAndComputeAsync),
 * and it never fabricates a value for a field this module doesn't
 * actually collect yet - those render as "Not Specified" instead.
 */
public class PurchaseRequisitionPdfDocument : IDocument
{
    private readonly Models.PurchaseRequisition _pr;

    // Mirrors the brand palette already defined in
    // PurchaseRequisitionService.cs (lifted from the web app's own
    // --nova-* design tokens) so the PDF, the approval emails, and the
    // web UI all read as the same product. Kept as its own copy rather
    // than a shared reference - those constants are private to the
    // service class, and duplicating five color literals is a smaller,
    // safer footprint than widening that class's accessibility just for
    // this.
    private static readonly Color BrandColor = Color.FromHex("#0F4FD1");     // --nova-blue-600
    private static readonly Color ApproveColor = Color.FromHex("#0D9488");   // --nova-teal-500
    private static readonly Color RejectColor = Color.FromHex("#DC2626");    // --nova-red-500
    private static readonly Color AmberColor = Color.FromHex("#D97706");     // --nova-amber-500
    private static readonly Color SlateStrong = Color.FromHex("#0F172A");
    private static readonly Color SlateText = Color.FromHex("#334155");
    private static readonly Color MutedColor = Color.FromHex("#64748B");
    private static readonly Color BorderColor = Color.FromHex("#E2E8F0");
    private static readonly Color PanelBg = Color.FromHex("#F8FAFC");

    // Company/Entity letterhead logo for the PDF header - embedded as an
    // assembly resource (see PPS.LicenseManager.API.csproj) rather than
    // read from disk, so it doesn't depend on wwwroot or a volume mount
    // being present. Loaded once and reused for every PDF.
    private static readonly byte[] LogoBytes = LoadLogoBytes();

    private static byte[] LoadLogoBytes()
    {
        var assembly = typeof(PurchaseRequisitionPdfDocument).Assembly;
        const string resourceName = "PPS.LicenseManager.API.Assets.pps-logo.jpg";

        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException(
                $"Embedded resource '{resourceName}' not found - check the " +
                "EmbeddedResource entry in PPS.LicenseManager.API.csproj.");

        using var memoryStream = new MemoryStream();
        stream.CopyTo(memoryStream);
        return memoryStream.ToArray();
    }

    public PurchaseRequisitionPdfDocument(Models.PurchaseRequisition pr)
    {
        _pr = pr;
    }

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(1.8f, Unit.Centimetre);
            page.DefaultTextStyle(x => x.FontSize(9).FontColor(SlateText));

            page.Header().Element(ComposeHeader);
            page.Content().PaddingTop(10).Element(ComposeContent);
            page.Footer().Element(ComposeFooter);
        });
    }


    // =========================================================
    // HEADER / STATUS WATERMARK
    // =========================================================

    private void ComposeHeader(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().Row(row =>
            {
                // Letterhead block: logo, then the issuing entity's
                // Address/GSTIN stacked below it - only when the Company
                // record actually has them set (see AddIfPresent's
                // comment: an empty field is omitted, never shown as
                // "Not Specified").
                row.ConstantItem(170).Column(entityColumn =>
                {
                    entityColumn.Item().Height(45).Image(LogoBytes).FitArea();

                    if (!string.IsNullOrWhiteSpace(_pr.Company?.Address))
                    {
                        entityColumn.Item().PaddingTop(3)
                            .Text(_pr.Company!.Address).FontSize(6.5f).FontColor(MutedColor);
                    }

                    if (!string.IsNullOrWhiteSpace(_pr.Company?.GSTNumber))
                    {
                        entityColumn.Item().PaddingTop(1)
                            .Text($"GSTIN: {_pr.Company!.GSTNumber}").FontSize(6.5f).FontColor(MutedColor);
                    }
                });

                row.RelativeItem();

                row.ConstantItem(230).AlignRight().Column(statusColumn =>
                {
                    statusColumn.Item().AlignRight()
                        .Text("PURCHASE REQUISITION").FontSize(13).Bold().FontColor(BrandColor);

                    statusColumn.Item().AlignRight()
                        .Text(_pr.PrNumber ?? $"Draft #{_pr.Id}")
                        .FontSize(10).FontColor(MutedColor);

                    statusColumn.Item().AlignRight().PaddingTop(1)
                        .Text(RevisionLabel())
                        .FontSize(8).FontColor(MutedColor);

                    statusColumn.Item().AlignRight().PaddingTop(5)
                        .Element(ComposeStatusChip);
                });
            });

            column.Item().PaddingTop(8).Row(row =>
            {
                row.RelativeItem().Text(t =>
                {
                    t.Span("PR Date: ").FontSize(8).FontColor(MutedColor);
                    t.Span(_pr.CreatedAt.ToString("d MMM yyyy")).FontSize(8).FontColor(SlateText);
                });

                row.RelativeItem().AlignRight().Text(t =>
                {
                    t.Span("Generated: ").FontSize(8).FontColor(MutedColor);
                    t.Span(DateTime.UtcNow.ToString("d MMM yyyy, HH:mm 'UTC'")).FontSize(8).FontColor(SlateText);
                });
            });

            column.Item().PaddingTop(6).LineHorizontal(1).LineColor(BorderColor);
        });
    }

    // "Rev 00" for every normally-created PR; "Rev 01 - Revision of
    // PR-XXXX-2026-0009" once CreateRevisionAsync has cloned it forward.
    private string RevisionLabel()
    {
        var label = $"Rev {_pr.RevisionNumber:00}";

        if (_pr.PreviousRevision != null)
        {
            var previousLabel = _pr.PreviousRevision.PrNumber ?? $"#{_pr.PreviousRevision.Id}";
            label += $"  ·  Revision of {previousLabel}";
        }

        return label;
    }

    // A small, professional text chip rather than a huge decorative
    // graphic - the spec explicitly asks for the status to be
    // "prominently displayed" without "huge decorative graphics".
    private void ComposeStatusChip(IContainer container)
    {
        var (label, color) = ResolveStatusWatermark();

        container.Background(color).PaddingVertical(3).PaddingHorizontal(8)
            .Text(label).FontSize(8).Bold().FontColor(Colors.White);
    }

    private (string Label, Color Color) ResolveStatusWatermark()
    {
        return _pr.Status switch
        {
            "Draft" => ("DRAFT — NOT VALID FOR PROCUREMENT", AmberColor),
            "Submitted" => ("PENDING APPROVAL", AmberColor),
            "InApproval" => ("PENDING APPROVAL", AmberColor),
            "Approved" => ("APPROVED — VALID FOR PO PROCESSING", ApproveColor),
            "Rejected" => ("REJECTED", RejectColor),
            "Cancelled" => ("CANCELLED", RejectColor),
            _ => (_pr.Status.ToUpperInvariant(), MutedColor)
        };
    }


    // =========================================================
    // CONTENT
    // =========================================================

    private void ComposeContent(IContainer container)
    {
        container.Column(column =>
        {
            column.Spacing(14);

            column.Item().Text(_pr.Title).FontSize(13).Bold().FontColor(SlateStrong);

            column.Item().Element(c => ComposeSection(c, "1. Request Information", ComposeRequestInformation));
            column.Item().Element(c => ComposeSection(c, "2. Business Justification", ComposeBusinessJustification));
            column.Item().Element(c => ComposeSection(c, "3. Item / Service Details", ComposeLineItemsTable));
            column.Item().Element(c => ComposeSection(c, "4. Technical Specification / Scope", ComposeTechnicalSpecification));
            column.Item().Element(c => ComposeSection(c, "5. Vendor Information", ComposeVendorDetails));
            column.Item().Element(c => ComposeSection(c, "6. Commercial Summary", ComposeCommercialSummary));
            column.Item().Element(c => ComposeSection(c, "7. Approval History", ComposeApprovalHistoryTable));

            // Reported: this section was splitting across the page break
            // (title/first row on page 1, rest on page 2). EnsureSpace(120)
            // reserves a minimum height before rendering - if that much
            // space isn't left on the current page, QuestPDF moves the
            // whole section to a fresh page instead of splitting it
            // mid-way. Unlike QuestPDF's ShowEntire(), EnsureSpace()
            // doesn't throw if the section ever exceeds a full page's
            // height - it just renders as usual - so a bug elsewhere that
            // makes this section unexpectedly tall can't break PDF
            // generation outright.
            //
            // (An earlier version of this fix called a method named
            // EnsureSpaceBeforeStartsNewPage(120), which doesn't exist in
            // QuestPDF and failed to compile - EnsureSpace(120) is the
            // real API.)
            column.Item().EnsureSpace(120)
                .Element(c => ComposeSection(c, "8. Finance / Procurement Action", ComposeFinanceAction));

            if (_pr.Attachments.Count > 0)
            {
                column.Item().Element(c => ComposeSection(c, "9. Supporting Documents", ComposeAttachmentsTable));
            }
        });
    }

    // Every numbered section shares the same header style/spacing - one
    // place to keep that consistent, per the spec's "consistent
    // typography/spacing across sections" instruction.
    private static void ComposeSection(IContainer container, string title, Action<IContainer> body)
    {
        container.Column(column =>
        {
            column.Item().Text(title).FontSize(11).Bold().FontColor(BrandColor);
            column.Item().PaddingTop(5).Element(body);
        });
    }

    private static string OrNotSpecified(string? value) =>
        string.IsNullOrWhiteSpace(value) ? "Not Specified" : value;

    // Per feedback on the first deployed version: an unset field should
    // simply not appear on the document rather than print as literal
    // "Not Specified" - so field-grid rows now use this instead of
    // OrNotSpecified() wherever the field is genuinely optional (has no
    // guaranteed source, unlike e.g. Requested By or Entity).
    private static void AddIfPresent(List<(string Label, string Value)> fields, string label, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value))
        {
            fields.Add((label, value!));
        }
    }


    // =========================================================
    // 1. REQUEST INFORMATION
    // =========================================================

    private void ComposeRequestInformation(IContainer container)
    {
        var requestedByName = _pr.RequestedByUser == null
            ? "-"
            : string.IsNullOrWhiteSpace(_pr.RequestedByUser.EmployeeCode)
                ? _pr.RequestedByUser.FullName
                : $"{_pr.RequestedByUser.FullName} ({_pr.RequestedByUser.EmployeeCode})";

        // Purchase Type/Priority/Required-By-Date/Cost Center/Project are
        // intentionally not listed here - this module has no backing field
        // for any of them yet, and per feedback an unavailable field is
        // omitted rather than printed as "Not Specified" (see
        // AddIfPresent's comment).
        var fields = new List<(string Label, string Value)>
        {
            ("Requested By", requestedByName),
        };

        AddIfPresent(fields, "Department", _pr.Department?.DepartmentName);

        fields.Add(("Entity", _pr.Company?.Name ?? "-"));
        fields.Add(("Request Date", _pr.CreatedAt.ToString("d MMM yyyy")));
        fields.Add(("Submitted Date", _pr.SubmittedAt?.ToString("d MMM yyyy") ?? "-"));

        if (_pr.InitiatedByContact != null)
        {
            fields.Add(("Initiated By", _pr.InitiatedByContact.FullName));
        }

        ComposeFieldGrid(container, fields.ToArray(), columnsPerRow: 3);
    }

    private static void ComposeFieldGrid(
        IContainer container,
        (string Label, string Value)[] fields,
        int columnsPerRow)
    {
        container.Column(column =>
        {
            column.Spacing(8);

            for (var i = 0; i < fields.Length; i += columnsPerRow)
            {
                var rowFields = fields.Skip(i).Take(columnsPerRow).ToArray();

                column.Item().Row(row =>
                {
                    foreach (var field in rowFields)
                    {
                        row.RelativeItem().Column(c =>
                        {
                            c.Item().Text(field.Label).FontSize(7.5f).FontColor(MutedColor);
                            c.Item().Text(field.Value).FontSize(9).SemiBold().FontColor(SlateStrong);
                        });
                    }

                    // Pad the last, partially-filled row so its items keep
                    // the same width as a full row instead of stretching -
                    // an empty RelativeItem takes up space without
                    // rendering anything.
                    for (var pad = rowFields.Length; pad < columnsPerRow; pad++)
                    {
                        row.RelativeItem();
                    }
                });
            }
        });
    }


    // =========================================================
    // 2. BUSINESS JUSTIFICATION
    // =========================================================

    private void ComposeBusinessJustification(IContainer container)
    {
        container.Text(OrNotSpecified(_pr.Justification)).FontSize(9.5f).FontColor(SlateText);
    }


    // =========================================================
    // 3. ITEM / SERVICE DETAILS
    // =========================================================

    private void ComposeLineItemsTable(IContainer container)
    {
        container.Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.ConstantColumn(22);
                columns.RelativeColumn(3);
                columns.RelativeColumn(1.4f);
                columns.RelativeColumn(0.8f);
                columns.RelativeColumn(0.8f);
                columns.RelativeColumn(1.2f);
                columns.RelativeColumn(1.2f);
            });

            table.Header(header =>
            {
                header.Cell().Element(HeaderCellStyle).Text("#");
                header.Cell().Element(HeaderCellStyle).Text("Description");
                header.Cell().Element(HeaderCellStyle).Text("Category");
                header.Cell().Element(HeaderCellStyle).AlignRight().Text("Qty");
                header.Cell().Element(HeaderCellStyle).Text("UOM");
                header.Cell().Element(HeaderCellStyle).AlignRight().Text("Unit Price");
                header.Cell().Element(HeaderCellStyle).AlignRight().Text("Line Total");

                static IContainer HeaderCellStyle(IContainer c) =>
                    c.Background(PanelBg)
                        .DefaultTextStyle(x => x.SemiBold().FontSize(8).FontColor(SlateStrong))
                        .PaddingVertical(5).PaddingHorizontal(3)
                        .BorderBottom(1).BorderColor(BrandColor);
            });

            // LineTotal/UnitPrice/Quantity are printed exactly as stored -
            // never recomputed here (see this class's header comment). A
            // stored value that doesn't reconcile as Quantity x UnitPrice
            // would be a data issue to fix at the source, not something
            // this layer silently corrects or hides.
            foreach (var item in _pr.LineItems.OrderBy(li => li.LineNumber))
            {
                table.Cell().Element(BodyCellStyle).Text(item.LineNumber.ToString());
                table.Cell().Element(BodyCellStyle).Text(item.ItemDescription);
                table.Cell().Element(BodyCellStyle).Text(item.Category ?? "-");
                table.Cell().Element(BodyCellStyle).AlignRight().Text($"{item.Quantity:0.##}");
                table.Cell().Element(BodyCellStyle).Text(item.UnitOfMeasure ?? "-");
                table.Cell().Element(BodyCellStyle).AlignRight()
                    .Text(CurrencyInWordsFormatter.FormatCurrency(item.UnitPrice, _pr.Currency));
                table.Cell().Element(BodyCellStyle).AlignRight()
                    .Text(CurrencyInWordsFormatter.FormatCurrency(item.LineTotal, _pr.Currency));

                static IContainer BodyCellStyle(IContainer c) =>
                    c.PaddingVertical(5).PaddingHorizontal(3)
                        .BorderBottom(1).BorderColor(BorderColor)
                        .DefaultTextStyle(x => x.FontSize(8.5f));
            }
        });
    }


    // =========================================================
    // 4. TECHNICAL SPECIFICATION / SCOPE
    // =========================================================

    // No PR-level technical-specification field exists - the closest
    // real data is each line item's own free-text Notes. If nothing has
    // any Notes, this says so rather than inventing content.
    private void ComposeTechnicalSpecification(IContainer container)
    {
        var itemsWithNotes = _pr.LineItems
            .Where(li => !string.IsNullOrWhiteSpace(li.Notes))
            .OrderBy(li => li.LineNumber)
            .ToList();

        if (itemsWithNotes.Count == 0)
        {
            container.Text("Technical specification not provided.")
                .FontSize(9).Italic().FontColor(MutedColor);
            return;
        }

        container.Column(column =>
        {
            column.Spacing(4);

            foreach (var item in itemsWithNotes)
            {
                column.Item().Text(t =>
                {
                    t.Span($"Item {item.LineNumber} ({item.ItemDescription}): ").SemiBold().FontSize(9);
                    t.Span(item.Notes).FontSize(9);
                });
            }
        });
    }


    // =========================================================
    // 5. VENDOR INFORMATION
    // =========================================================

    private void ComposeVendorDetails(IContainer container)
    {
        var vendor = _pr.Vendor;

        if (vendor == null)
        {
            container.Text("No vendor selected for this purchase requisition.")
                .FontSize(9).Italic().FontColor(MutedColor);
            return;
        }

        // Quotation Number/Date/Validity and Payment/Delivery
        // Terms/Warranty are intentionally not listed - no backing field
        // exists for any of them yet (see AddIfPresent's comment).
        var fields = new List<(string Label, string Value)>
        {
            ("Vendor Name", vendor.VendorName),
            ("Vendor Code", vendor.VendorCode),
        };

        AddIfPresent(fields, "GSTIN", vendor.GSTIN);
        AddIfPresent(fields, "Contact Person", vendor.ContactPerson);
        AddIfPresent(fields, "Email", vendor.Email);
        AddIfPresent(fields, "Phone", vendor.Phone);
        AddIfPresent(fields, "Address", vendor.Address);

        container.Background(PanelBg).Padding(8).Element(c => ComposeFieldGrid(c, fields.ToArray(), columnsPerRow: 3));
    }


    // =========================================================
    // 6. COMMERCIAL SUMMARY
    // =========================================================

    private void ComposeCommercialSummary(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().AlignRight().Column(totals =>
            {
                totals.Spacing(3);

                totals.Item().Row(row =>
                {
                    row.RelativeItem().AlignRight().Text("Subtotal").FontSize(9);
                    row.ConstantItem(120).AlignRight()
                        .Text(CurrencyInWordsFormatter.FormatCurrency(_pr.SubtotalAmount, _pr.Currency)).FontSize(9);
                });

                totals.Item().Row(row =>
                {
                    row.RelativeItem().AlignRight().Text($"CGST ({_pr.CgstPercent:0.##}%)").FontSize(9);
                    row.ConstantItem(120).AlignRight()
                        .Text(CurrencyInWordsFormatter.FormatCurrency(
                            _pr.SubtotalAmount * _pr.CgstPercent / 100m, _pr.Currency)).FontSize(9);
                });

                totals.Item().Row(row =>
                {
                    row.RelativeItem().AlignRight().Text($"SGST ({_pr.SgstPercent:0.##}%)").FontSize(9);
                    row.ConstantItem(120).AlignRight()
                        .Text(CurrencyInWordsFormatter.FormatCurrency(
                            _pr.SubtotalAmount * _pr.SgstPercent / 100m, _pr.Currency)).FontSize(9);
                });

                totals.Item().PaddingTop(3).BorderTop(1).BorderColor(BorderColor)
                    .PaddingTop(3).Row(row =>
                    {
                        row.RelativeItem().AlignRight().Text("Total").Bold().FontSize(10);
                        row.ConstantItem(120).AlignRight()
                            .Text(CurrencyInWordsFormatter.FormatCurrency(_pr.TotalAmount, _pr.Currency))
                            .Bold().FontSize(10);
                    });
            });

            column.Item().PaddingTop(6).Background(PanelBg).Padding(6).Text(t =>
            {
                t.Span("Amount in Words: ").SemiBold().FontSize(8.5f).FontColor(MutedColor);
                t.Span(CurrencyInWordsFormatter.Convert(_pr.TotalAmount, _pr.Currency))
                    .FontSize(8.5f).FontColor(SlateStrong);
            });
        });
    }


    // =========================================================
    // 7. APPROVAL HISTORY
    // =========================================================

    private void ComposeApprovalHistoryTable(IContainer container)
    {
        if (_pr.ApprovalSteps.Count == 0)
        {
            container.Text("No approval steps have been recorded yet.")
                .FontSize(9).Italic().FontColor(MutedColor);
            return;
        }

        container.Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.ConstantColumn(40);
                columns.RelativeColumn(2);
                columns.RelativeColumn(1);
                columns.RelativeColumn(1);
                columns.RelativeColumn(1.2f);
                columns.RelativeColumn(2);
            });

            table.Header(header =>
            {
                header.Cell().Element(HeaderCellStyle).Text("Stage");
                header.Cell().Element(HeaderCellStyle).Text("Approver");
                header.Cell().Element(HeaderCellStyle).Text("Employee ID");
                header.Cell().Element(HeaderCellStyle).Text("Status");
                header.Cell().Element(HeaderCellStyle).Text("Decided");
                header.Cell().Element(HeaderCellStyle).Text("Remarks");

                static IContainer HeaderCellStyle(IContainer c) =>
                    c.Background(PanelBg)
                        .DefaultTextStyle(x => x.SemiBold().FontSize(8).FontColor(SlateStrong))
                        .PaddingVertical(5).PaddingHorizontal(3)
                        .BorderBottom(1).BorderColor(BrandColor);
            });

            // Resolved via PurchaseRequisitionApproverDisplay - the same
            // helper the API response uses - so a step decided by an
            // external Contact shows that contact's real name here
            // instead of "-" (see that helper's own comment for why the
            // old direct AssignedApproverUser?.FullName lookup was wrong).
            foreach (var step in _pr.ApprovalSteps.OrderBy(s => s.StepOrder))
            {
                var approver = PurchaseRequisitionApproverDisplay.Resolve(step);
                var approverLabel = string.IsNullOrWhiteSpace(approver.Name)
                    ? "Not Specified"
                    : approver.ApproverType == "Contact"
                        ? $"{approver.Name} (external)"
                        : approver.Name;

                table.Cell().Element(BodyCellStyle).Text(step.StepOrder.ToString());
                table.Cell().Element(BodyCellStyle).Text(approverLabel);
                table.Cell().Element(BodyCellStyle).Text(approver.EmployeeCode ?? "-");
                table.Cell().Element(BodyCellStyle).Text(step.Status);
                table.Cell().Element(BodyCellStyle).Text(step.DecidedAt.HasValue
                    ? step.DecidedAt.Value.ToString("d MMM yyyy")
                    : "-");
                table.Cell().Element(BodyCellStyle).Text(step.Remarks ?? "-");

                static IContainer BodyCellStyle(IContainer c) =>
                    c.PaddingVertical(5).PaddingHorizontal(3)
                        .BorderBottom(1).BorderColor(BorderColor)
                        .DefaultTextStyle(x => x.FontSize(8.5f));
            }
        });
    }


    // =========================================================
    // 8. FINANCE / PROCUREMENT ACTION
    // =========================================================

    // Read-only display of fields that already exist on the model
    // (PoNumber/PoDocumentPath/PoUploadedAt/PoUploadedByUser - see that
    // model's own "Phase 2" comment) but aren't set by any endpoint yet.
    // This section only displays what Finance will eventually record
    // there in a future phase - no new PO endpoints/UI are introduced by
    // this change.
    private void ComposeFinanceAction(IContainer container)
    {
        // PO Required/Quotation Reference/Cost Center are intentionally
        // not listed - no backing field exists for any of them yet (see
        // AddIfPresent's comment).
        var fields = new List<(string Label, string Value)>
        {
            ("PR Approved", _pr.Status == "Approved" ? "Yes" : "No"),
            ("Approved PR Value", _pr.Status == "Approved"
                ? CurrencyInWordsFormatter.FormatCurrency(_pr.TotalAmount, _pr.Currency)
                : "-"),
        };

        AddIfPresent(fields, "Vendor", _pr.Vendor?.VendorName);

        fields.Add(("PO Number", string.IsNullOrWhiteSpace(_pr.PoNumber) ? "Pending" : _pr.PoNumber!));
        fields.Add(("PO Date", _pr.PoUploadedAt?.ToString("d MMM yyyy") ?? "Pending"));
        fields.Add(("Processed By", _pr.PoUploadedByUser?.FullName ?? "Pending"));

        ComposeFieldGrid(container, fields.ToArray(), columnsPerRow: 3);
    }


    // =========================================================
    // 9. SUPPORTING DOCUMENTS
    // =========================================================

    // File names only, exactly like the app's own attachment list - never
    // StoredPath (the on-disk path), matching the spec's "do not expose
    // internal file paths" instruction.
    private void ComposeAttachmentsTable(IContainer container)
    {
        container.Table(table =>
        {
            table.ColumnsDefinition(columns =>
            {
                columns.RelativeColumn(3);
                columns.RelativeColumn(1.2f);
                columns.RelativeColumn(1.5f);
                columns.RelativeColumn(1.2f);
            });

            table.Header(header =>
            {
                header.Cell().Element(HeaderCellStyle).Text("Document Name");
                header.Cell().Element(HeaderCellStyle).Text("Type");
                header.Cell().Element(HeaderCellStyle).Text("Uploaded By");
                header.Cell().Element(HeaderCellStyle).Text("Date");

                static IContainer HeaderCellStyle(IContainer c) =>
                    c.Background(PanelBg)
                        .DefaultTextStyle(x => x.SemiBold().FontSize(8).FontColor(SlateStrong))
                        .PaddingVertical(5).PaddingHorizontal(3)
                        .BorderBottom(1).BorderColor(BrandColor);
            });

            foreach (var attachment in _pr.Attachments.OrderBy(a => a.UploadedAt))
            {
                table.Cell().Element(BodyCellStyle).Text(attachment.FileName);
                table.Cell().Element(BodyCellStyle).Text(attachment.AttachmentType);
                table.Cell().Element(BodyCellStyle).Text(attachment.UploadedByUser?.FullName ?? "-");
                table.Cell().Element(BodyCellStyle).Text(attachment.UploadedAt.ToString("d MMM yyyy"));

                static IContainer BodyCellStyle(IContainer c) =>
                    c.PaddingVertical(5).PaddingHorizontal(3)
                        .BorderBottom(1).BorderColor(BorderColor)
                        .DefaultTextStyle(x => x.FontSize(8.5f));
            }
        });
    }


    // =========================================================
    // DOCUMENT-CONTROL FOOTER (every page)
    // =========================================================

    private void ComposeFooter(IContainer container)
    {
        container.PaddingTop(6).BorderTop(1).BorderColor(BorderColor).PaddingTop(4).Column(column =>
        {
            column.Item().Row(row =>
            {
                row.RelativeItem().Text(t =>
                {
                    t.Span("Document ID: ").FontSize(7).FontColor(MutedColor);
                    t.Span(_pr.PrNumber ?? $"Draft #{_pr.Id}").FontSize(7).FontColor(SlateText);
                    t.Span("   ·   Revision: ").FontSize(7).FontColor(MutedColor);
                    t.Span($"{_pr.RevisionNumber:00}").FontSize(7).FontColor(SlateText);
                    t.Span("   ·   Status: ").FontSize(7).FontColor(MutedColor);
                    t.Span(_pr.Status).FontSize(7).FontColor(SlateText);
                });

                row.RelativeItem().AlignRight().DefaultTextStyle(x => x.FontSize(7).FontColor(SlateText))
                    .Text(t =>
                    {
                        t.Span("Page ").FontColor(MutedColor);
                        t.CurrentPageNumber();
                        t.Span(" of ").FontColor(MutedColor);
                        t.TotalPages();
                    });
            });

            column.Item().PaddingTop(1).Row(row =>
            {
                row.RelativeItem().Text(t =>
                {
                    t.Span("Generated ").FontSize(7).FontColor(MutedColor);
                    t.Span(DateTime.UtcNow.ToString("d MMM yyyy, HH:mm 'UTC'")).FontSize(7).FontColor(MutedColor);
                    t.Span("   ·   Source: PPS SmartAsset").FontSize(7).FontColor(MutedColor);
                });

                row.RelativeItem().AlignRight()
                    .Text("System Generated Controlled Document | Internal Use Only")
                    .FontSize(7).Italic().FontColor(MutedColor);
            });
        });
    }
}
