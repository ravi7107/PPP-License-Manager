using PPS.LicenseManager.API.DTOs.Inventory;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PPS.LicenseManager.API.Services;

/*
 * A small, printable inventory item label: a real scannable QR code
 * (encoding InventoryTag - see AssetQrCodeGenerator, reused as-is)
 * alongside the item's identity. Mirrors AssetQrLabelPdfDocument
 * exactly - same 10cm x 6cm card size, same generated-on-demand-never-
 * persisted design, same "always reflects the item's current fields"
 * property.
 */
public class InventoryQrLabelPdfDocument : IDocument
{
    private readonly InventoryItemResponse _item;
    private readonly string _qrSvg;

    public InventoryQrLabelPdfDocument(InventoryItemResponse item)
    {
        _item = item;
        _qrSvg = AssetQrCodeGenerator.GenerateSvg(item.InventoryTag);
    }

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(10, 6, Unit.Centimetre);
            page.Margin(0.4f, Unit.Centimetre);
            page.DefaultTextStyle(x => x.FontSize(8));

            page.Content().Row(row =>
            {
                row.ConstantItem(119)
                    .AlignMiddle()
                    .AspectRatio(1)
                    .Svg(_qrSvg);

                row.RelativeItem().PaddingLeft(10).Column(column =>
                {
                    column.Item().Text(_item.InventoryTag).FontSize(16).Bold();

                    column.Item().PaddingTop(4).Text(_item.ItemName).FontSize(9);

                    column.Item().PaddingTop(2)
                        .Text(_item.CategoryName)
                        .FontSize(8).FontColor(Colors.Grey.Darken2);

                    if (!string.IsNullOrWhiteSpace(_item.LocationName))
                    {
                        column.Item().PaddingTop(2)
                            .Text(_item.LocationName)
                            .FontSize(7).FontColor(Colors.Grey.Darken1);
                    }

                    if (!string.IsNullOrWhiteSpace(_item.SerialNumber))
                    {
                        column.Item().PaddingTop(2)
                            .Text($"S/N: {_item.SerialNumber}")
                            .FontSize(7).FontColor(Colors.Grey.Darken1);
                    }
                });
            });
        });
    }
}
