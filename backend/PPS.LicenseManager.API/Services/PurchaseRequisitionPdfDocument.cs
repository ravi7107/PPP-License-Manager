using System.Reflection;
using QuestPDF.Drawing;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PPS.LicenseManager.API.Services;

/*
 * Renders a single Purchase Requisition - header, requester/entity
 * summary, line items, CGST/SGST totals, full approval history, and any
 * attachments - as a PDF via QuestPDF's fluent API.
 *
 * Generated on final approval (see
 * PurchaseRequisitionService.GenerateAndStorePdfAsync) and lazily
 * (re)generated on download if missing (see GetPdfFileAsync), and stored
 * outside wwwroot so it's reachable only through the authenticated
 * GET /api/PurchaseRequisition/{id}/pdf endpoint - never as a bare
 * static file URL the way attachments are.
 *
 * The caller is responsible for loading every navigation this class
 * reads (Company, Department, RequestedByUser, LineItems, Attachments,
 * ApprovalSteps.AssignedApproverUser) - see PurchaseRequisitionService's
 * private Query() method, which already includes all of them.
 */
public class PurchaseRequisitionPdfDocument : IDocument
{
    private readonly Models.PurchaseRequisition _pr;

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
            page.Margin(2, Unit.Centimetre);
            page.DefaultTextStyle(x => x.FontSize(10));

            page.Header().Element(ComposeHeader);
            page.Content().Element(ComposeContent);

            page.Footer().AlignCenter().Text(text =>
            {
                text.Span("Page ");
                text.CurrentPageNumber();
                text.Span(" of ");
                text.TotalPages();
            });
        });
    }

    private void ComposeHeader(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().Row(row =>
            {
                // Letterhead logo. This is a fixed company logo (not the
                // per-PR Entity/Company name/address) - the Entity itself
                // is shown down in the requester/entity summary row via
                // its GSTIN, so it isn't repeated here.
                row.ConstantItem(140).Height(45)
                    .Image(LogoBytes).FitArea();

                row.RelativeItem();

                row.ConstantItem(180).AlignRight().Column(statusColumn =>
                {
                    statusColumn.Item().AlignRight()
                        .Text("Purchase Requisition")
                        .FontSize(12).Bold();

                    statusColumn.Item().AlignRight()
                        .Text(_pr.PrNumber ?? $"Draft #{_pr.Id}")
                        .FontSize(10).FontColor(Colors.Grey.Darken2);

                    statusColumn.Item().AlignRight().PaddingTop(4)
                        .Text(_pr.Status)
                        .FontSize(12).Bold()
                        .FontColor(_pr.Status == "Approved" ? Colors.Green.Darken2 : Colors.Black);

                    if (_pr.ApprovedAt.HasValue)
                    {
                        statusColumn.Item().AlignRight()
                            .Text($"Approved {_pr.ApprovedAt.Value:d MMM yyyy}")
                            .FontSize(9).FontColor(Colors.Grey.Darken1);
                    }
                });
            });

            column.Item().PaddingTop(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
        });
    }

    private void ComposeContent(IContainer container)
    {
        container.PaddingVertical(15).Column(column =>
        {
            column.Spacing(12);

            column.Item().Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Requested By").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_pr.RequestedByUser?.FullName ?? "-").Bold();
                });

                row.RelativeItem().Column(c =>
                {
                    // Department is no longer collected on new PRs (Entity
                    // now covers that role) - GSTIN is the more useful
                    // thing to show here now that tax is broken into
                    // CGST/SGST below.
                    c.Item().Text("GSTIN").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_pr.Company?.GSTNumber ?? "-").Bold();
                });

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Vendor").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_pr.Vendor?.VendorName ?? "-").Bold();
                });

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Submitted").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_pr.SubmittedAt.HasValue
                        ? _pr.SubmittedAt.Value.ToString("d MMM yyyy")
                        : "-").Bold();
                });
            });

            column.Item().Text(_pr.Title).FontSize(13).Bold();

            if (!string.IsNullOrWhiteSpace(_pr.Justification))
            {
                column.Item().Column(c =>
                {
                    c.Item().Text("Justification").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_pr.Justification);
                });
            }

            if (_pr.Vendor != null)
            {
                column.Item().Element(ComposeVendorDetails);
            }

            column.Item().Element(ComposeLineItemsTable);

            column.Item().AlignRight().Column(totals =>
            {
                totals.Item().Row(row =>
                {
                    row.RelativeItem().AlignRight().Text("Subtotal");
                    row.ConstantItem(110).AlignRight()
                        .Text($"{_pr.Currency} {_pr.SubtotalAmount:0.00}");
                });

                // Shown as CGST + SGST (India's split GST scheme) rather
                // than a single flat tax line - each percentage is stored
                // per PR (see PurchaseRequisitionService.
                // ValidateAndComputeAsync) and can differ PR-to-PR.
                totals.Item().Row(row =>
                {
                    row.RelativeItem().AlignRight().Text($"CGST ({_pr.CgstPercent:0.##}%)");
                    row.ConstantItem(110).AlignRight()
                        .Text($"{_pr.Currency} {_pr.SubtotalAmount * _pr.CgstPercent / 100m:0.00}");
                });

                totals.Item().Row(row =>
                {
                    row.RelativeItem().AlignRight().Text($"SGST ({_pr.SgstPercent:0.##}%)");
                    row.ConstantItem(110).AlignRight()
                        .Text($"{_pr.Currency} {_pr.SubtotalAmount * _pr.SgstPercent / 100m:0.00}");
                });

                totals.Item().Row(row =>
                {
                    row.RelativeItem().AlignRight().Text("Total").Bold();
                    row.ConstantItem(110).AlignRight()
                        .Text($"{_pr.Currency} {_pr.TotalAmount:0.00}").Bold();
                });
            });

            column.Item().Element(ComposeApprovalHistoryTable);

            if (_pr.Attachments.Count > 0)
            {
                column.Item().Element(ComposeAttachmentsList);
            }
        });
    }

    // Only called when _pr.Vendor is non-null (see ComposeContent) - the
    // requester picked a vendor from the master Vendor list when creating
    // or editing the draft (see PurchaseRequisitionService.
    // ValidateAndComputeAsync).
    private void ComposeVendorDetails(IContainer container)
    {
        var vendor = _pr.Vendor!;

        container.Background(Colors.Grey.Lighten4).Padding(8).Column(column =>
        {
            column.Item().Text("Vendor Details").FontSize(11).Bold();

            column.Item().PaddingTop(4).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Vendor").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text($"{vendor.VendorName} ({vendor.VendorCode})").Bold();

                    if (!string.IsNullOrWhiteSpace(vendor.Address))
                    {
                        c.Item().PaddingTop(2).Text(vendor.Address).FontSize(9);
                    }
                });

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Contact").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(vendor.ContactPerson ?? "-").Bold();

                    if (!string.IsNullOrWhiteSpace(vendor.Email))
                    {
                        c.Item().PaddingTop(2).Text(vendor.Email).FontSize(9);
                    }

                    if (!string.IsNullOrWhiteSpace(vendor.Phone))
                    {
                        c.Item().Text(vendor.Phone).FontSize(9);
                    }
                });
            });
        });
    }

    private void ComposeLineItemsTable(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().Text("Line Items").FontSize(11).Bold();

            column.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(25);
                    columns.RelativeColumn(3);
                    columns.RelativeColumn(1.5f);
                    columns.RelativeColumn(0.8f);
                    columns.RelativeColumn(0.8f);
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                });

                table.Header(header =>
                {
                    header.Cell().Element(HeaderCellStyle).Text("#");
                    header.Cell().Element(HeaderCellStyle).Text("Description");
                    header.Cell().Element(HeaderCellStyle).Text("Category");
                    header.Cell().Element(HeaderCellStyle).AlignRight().Text("Qty");
                    header.Cell().Element(HeaderCellStyle).Text("Unit");
                    header.Cell().Element(HeaderCellStyle).AlignRight().Text("Unit Price");
                    header.Cell().Element(HeaderCellStyle).AlignRight().Text("Line Total");

                    static IContainer HeaderCellStyle(IContainer c) =>
                        c.DefaultTextStyle(x => x.SemiBold())
                            .PaddingVertical(4)
                            .BorderBottom(1)
                            .BorderColor(Colors.Black);
                });

                foreach (var item in _pr.LineItems.OrderBy(li => li.LineNumber))
                {
                    table.Cell().Element(BodyCellStyle).Text(item.LineNumber.ToString());
                    table.Cell().Element(BodyCellStyle).Text(item.ItemDescription);
                    table.Cell().Element(BodyCellStyle).Text(item.Category ?? "-");
                    // Quantity is numeric(18,2) - Postgres always returns
                    // it padded to exactly 2 decimal places (e.g. a
                    // quantity of 10 comes back as 10.00m), and decimal's
                    // default ToString() preserves that scale verbatim.
                    // ":0.##" drops the trailing zeros for whole numbers
                    // while still showing up to 2 decimals for a
                    // fractional quantity (e.g. 2.5).
                    //
                    // Unit is its own column (not appended after the
                    // quantity in the same cell) - a quantity of 1 with a
                    // numeric-looking unit like "2" would otherwise read
                    // as "1 2", easy to misread as "12".
                    table.Cell().Element(BodyCellStyle).AlignRight()
                        .Text($"{item.Quantity:0.##}");
                    table.Cell().Element(BodyCellStyle)
                        .Text(item.UnitOfMeasure ?? "-");
                    table.Cell().Element(BodyCellStyle).AlignRight().Text($"{item.UnitPrice:0.00}");
                    table.Cell().Element(BodyCellStyle).AlignRight().Text($"{item.LineTotal:0.00}");

                    static IContainer BodyCellStyle(IContainer c) =>
                        c.PaddingVertical(4)
                            .BorderBottom(1)
                            .BorderColor(Colors.Grey.Lighten2);
                }
            });
        });
    }

    private void ComposeApprovalHistoryTable(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().Text("Approval History").FontSize(11).Bold();

            column.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(50);
                    columns.RelativeColumn(2);
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                    columns.RelativeColumn(2);
                });

                table.Header(header =>
                {
                    header.Cell().Element(HeaderCellStyle).Text("Stage");
                    header.Cell().Element(HeaderCellStyle).Text("Approver");
                    header.Cell().Element(HeaderCellStyle).Text("Status");
                    header.Cell().Element(HeaderCellStyle).Text("Decided");
                    header.Cell().Element(HeaderCellStyle).Text("Remarks");

                    static IContainer HeaderCellStyle(IContainer c) =>
                        c.DefaultTextStyle(x => x.SemiBold())
                            .PaddingVertical(4)
                            .BorderBottom(1)
                            .BorderColor(Colors.Black);
                });

                foreach (var step in _pr.ApprovalSteps.OrderBy(s => s.StepOrder))
                {
                    table.Cell().Element(BodyCellStyle).Text(step.StepOrder.ToString());
                    table.Cell().Element(BodyCellStyle).Text(step.AssignedApproverUser?.FullName ?? "-");
                    table.Cell().Element(BodyCellStyle).Text(step.Status);
                    table.Cell().Element(BodyCellStyle).Text(step.DecidedAt.HasValue
                        ? step.DecidedAt.Value.ToString("d MMM yyyy")
                        : "-");
                    table.Cell().Element(BodyCellStyle).Text(step.Remarks ?? "-");

                    static IContainer BodyCellStyle(IContainer c) =>
                        c.PaddingVertical(4)
                            .BorderBottom(1)
                            .BorderColor(Colors.Grey.Lighten2);
                }
            });
        });
    }

    private void ComposeAttachmentsList(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().Text("Attachments").FontSize(11).Bold();

            foreach (var attachment in _pr.Attachments.OrderBy(a => a.UploadedAt))
            {
                column.Item().Text($"- {attachment.FileName} ({attachment.AttachmentType})").FontSize(9);
            }
        });
    }
}
