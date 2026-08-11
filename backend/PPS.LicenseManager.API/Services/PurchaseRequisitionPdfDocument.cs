using QuestPDF.Drawing;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PPS.LicenseManager.API.Services;

/*
 * Renders a single Purchase Requisition - header, requester/department
 * summary, line items, totals, full approval history, and any
 * attachments - as a PDF via QuestPDF's fluent API.
 *
 * Generated exactly once, on final approval (see
 * PurchaseRequisitionService.GenerateAndStorePdfAsync), and stored
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
                row.RelativeItem().Column(headerColumn =>
                {
                    headerColumn.Item()
                        .Text("Purchase Requisition")
                        .FontSize(18).Bold();

                    headerColumn.Item()
                        .Text(_pr.PrNumber ?? $"Draft #{_pr.Id}")
                        .FontSize(12).FontColor(Colors.Grey.Darken2);
                });

                row.ConstantItem(160).AlignRight().Column(statusColumn =>
                {
                    statusColumn.Item().AlignRight()
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
                    c.Item().Text("Department").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_pr.Department?.DepartmentName ?? "-").Bold();
                });

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Company").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_pr.Company?.Name ?? "-").Bold();
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

            column.Item().Element(ComposeLineItemsTable);

            column.Item().AlignRight().Column(totals =>
            {
                totals.Item().Row(row =>
                {
                    row.RelativeItem().AlignRight().Text("Subtotal");
                    row.ConstantItem(110).AlignRight()
                        .Text($"{_pr.Currency} {_pr.SubtotalAmount:0.00}");
                });

                totals.Item().Row(row =>
                {
                    row.RelativeItem().AlignRight().Text("Tax");
                    row.ConstantItem(110).AlignRight()
                        .Text($"{_pr.Currency} {_pr.TaxAmount:0.00}");
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
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                });

                table.Header(header =>
                {
                    header.Cell().Element(HeaderCellStyle).Text("#");
                    header.Cell().Element(HeaderCellStyle).Text("Description");
                    header.Cell().Element(HeaderCellStyle).Text("Category");
                    header.Cell().Element(HeaderCellStyle).AlignRight().Text("Qty");
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
                    table.Cell().Element(BodyCellStyle).AlignRight()
                        .Text($"{item.Quantity} {item.UnitOfMeasure}".Trim());
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
