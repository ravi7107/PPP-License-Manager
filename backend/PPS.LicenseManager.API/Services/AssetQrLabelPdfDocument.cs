using PPS.LicenseManager.API.DTOs.Asset;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PPS.LicenseManager.API.Services;

/*
 * A small, printable physical-asset label: a real scannable QR code
 * (encoding AssetTag - see AssetQrCodeGenerator) alongside the same
 * human-readable identity a technician would want on a sticker. Sized
 * as a compact card (10cm x 6cm), not a full A4 page, since this is
 * meant to be printed on label/sticker stock and physically affixed to
 * the asset - not filed as a document.
 *
 * Deliberately generated on demand from the asset's CURRENT fields
 * (never persisted to disk, unlike the Gate Pass / PR PDFs) - a label
 * can be reprinted at any point in the asset's life (initial
 * registration, a lost/damaged sticker, after an AssetTag correction)
 * and always reflects what the system says right now, per the "one
 * static identifier, regenerable for the asset's entire life" design
 * this was built for. See AssetController's GET {id}/qr-label action.
 */
public class AssetQrLabelPdfDocument : IDocument
{
    private readonly AssetResponse _asset;
    private readonly string _qrSvg;

    public AssetQrLabelPdfDocument(AssetResponse asset)
    {
        _asset = asset;
        _qrSvg = AssetQrCodeGenerator.GenerateSvg(asset.AssetTag);
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
                // 119pt ~= 4.2cm - using points here (not the Unit.Centimetre
                // overload) since that's the dimension convention already
                // proven working elsewhere in this codebase's PDF classes.
                row.ConstantItem(119)
                    .AlignMiddle()
                    .AspectRatio(1)
                    .Svg(_qrSvg);

                row.RelativeItem().PaddingLeft(10).Column(column =>
                {
                    column.Item().Text(_asset.AssetTag).FontSize(16).Bold();

                    column.Item().PaddingTop(4).Text(_asset.AssetName).FontSize(9);

                    if (!string.IsNullOrWhiteSpace(_asset.DepartmentName))
                    {
                        column.Item().PaddingTop(2)
                            .Text(_asset.DepartmentName)
                            .FontSize(8).FontColor(Colors.Grey.Darken2);
                    }

                    var manufacturerModel = string.Join(
                        " ",
                        new[] { _asset.Manufacturer, _asset.Model }
                            .Where(s => !string.IsNullOrWhiteSpace(s)));

                    if (!string.IsNullOrWhiteSpace(manufacturerModel))
                    {
                        column.Item().PaddingTop(2)
                            .Text(manufacturerModel)
                            .FontSize(7).FontColor(Colors.Grey.Darken1);
                    }

                    if (!string.IsNullOrWhiteSpace(_asset.SerialNumber))
                    {
                        column.Item().PaddingTop(2)
                            .Text($"S/N: {_asset.SerialNumber}")
                            .FontSize(7).FontColor(Colors.Grey.Darken1);
                    }
                });
            });
        });
    }
}
