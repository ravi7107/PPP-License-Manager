using PPS.LicenseManager.API.DTOs.Inventory;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PPS.LicenseManager.API.Services;

/*
 * A sheet of many inventory labels on standard A4 pages (2 columns),
 * each cell a compact version of InventoryQrLabelPdfDocument's single-
 * item card. Exists for printing a batch of stickers right after a
 * bulk import/seed, where downloading one label PDF per item would be
 * impractical - Asset has no equivalent today, since Assets are
 * registered one at a time far more often than in large batches.
 * QuestPDF's Table flows across as many pages as the item count needs,
 * so this has no hard page-count limit of its own (the controller caps
 * the request at 200 items for a sane single download).
 */
public class InventoryQrLabelSheetPdfDocument : IDocument
{
    private readonly List<InventoryItemResponse> _items;

    public InventoryQrLabelSheetPdfDocument(List<InventoryItemResponse> items)
    {
        _items = items;
    }

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(1, Unit.Centimetre);
            page.DefaultTextStyle(x => x.FontSize(7));

            page.Content().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                });

                foreach (var item in _items)
                {
                    table.Cell().Border(0.5f).BorderColor(Colors.Grey.Lighten2)
                        .Padding(8).Element(cell => ComposeLabelCell(cell, item));
                }
            });
        });
    }

    private void ComposeLabelCell(IContainer container, InventoryItemResponse item)
    {
        var qrSvg = AssetQrCodeGenerator.GenerateSvg(item.DisplayTag);

        container.Row(row =>
        {
            row.ConstantItem(70)
                .AlignMiddle()
                .AspectRatio(1)
                .Svg(qrSvg);

            row.RelativeItem().PaddingLeft(8).Column(column =>
            {
                column.Item().Text(item.DisplayTag).FontSize(11).Bold();

                column.Item().PaddingTop(2).Text(item.ItemName).FontSize(8);

                column.Item().PaddingTop(1)
                    .Text(item.CategoryName)
                    .FontSize(7).FontColor(Colors.Grey.Darken2);

                if (!string.IsNullOrWhiteSpace(item.LocationName))
                {
                    column.Item().PaddingTop(1)
                        .Text(item.LocationName)
                        .FontSize(6).FontColor(Colors.Grey.Darken1);
                }
            });
        });
    }
}
