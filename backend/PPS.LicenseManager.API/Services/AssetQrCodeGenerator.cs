using ZXing;
using ZXing.QrCode;
using ZXing.Rendering;

namespace PPS.LicenseManager.API.Services;

/*
 * Renders a real, scannable QR code as SVG markup for embedding in a
 * QuestPDF document. Encodes exactly the asset's AssetTag - the same
 * value AssetController.GetByCode already resolves an asset from (see
 * that action's own comment: "a scanned QR/barcode encodes an
 * AssetTag"), and the same value the previously-built PPS Asset Scanner
 * mobile app already expects to read off a scanned label. This is the
 * one thing that needed to exist for that mobile app's scan-to-lookup
 * flow to actually work against a printed label - the flow itself
 * (GetByCode, AssetAuditController.Scan) was already built and needed no
 * change.
 *
 * SVG (not a raster PNG/JPEG) so the QR code stays crisp at any print
 * size - QuestPDF renders SVG as vector content, and ZXing's SvgRenderer
 * draws each QR module as a real <rect>, not a bitmap.
 *
 * ZXing.Net is pure managed .NET with no native dependencies (confirmed
 * on nuget.org before adding it) - the same due-diligence step every
 * other new package this session went through before being pinned.
 */
public static class AssetQrCodeGenerator
{
    public static string GenerateSvg(string content, int size = 300)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new ArgumentException("QR code content cannot be empty.", nameof(content));
        }

        var writer = new QRCodeWriter();
        var matrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size);

        var renderer = new SvgRenderer();
        return renderer.Render(matrix, BarcodeFormat.QR_CODE, content).Content;
    }
}
