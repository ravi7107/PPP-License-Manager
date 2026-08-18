using System.Globalization;
using System.Text;

namespace PPS.LicenseManager.API.Services;

/*
 * Renders a currency amount as words for the Purchase Requisition PDF's
 * Commercial Summary ("Amount in Words") - e.g. 118000.00 -> "Rupees One
 * Lakh Eighteen Thousand Only". No number-to-words package exists in
 * this project (checked the .csproj - no Humanizer or similar), so this
 * is a small, self-contained, dependency-free converter rather than a
 * new NuGet package that can't be compile-verified in this sandbox
 * (there's no `dotnet` CLI available here).
 *
 * Uses Indian digit grouping (thousand / lakh / crore / arab / kharab -
 * groups of 2 after the first 3 digits), matching the CGST/SGST split-GST
 * scheme this module already uses elsewhere - this is an India-focused
 * procurement document, not a generic international one.
 */
public static class CurrencyInWordsFormatter
{
    private static readonly string[] Ones =
    {
        "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
        "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
        "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    };

    private static readonly string[] Tens =
    {
        "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy",
        "Eighty", "Ninety"
    };

    // Currency-code -> (major unit name, minor unit name). Falls back to
    // the raw ISO code (plus a generic "Cents" minor unit) for anything
    // not listed - this module already stores Currency as a free 3-char
    // code (see PurchaseRequisition.Currency), so an unrecognized code is
    // a real possibility, not just a defensive branch.
    private static readonly Dictionary<string, (string Major, string Minor)> UnitNames = new()
    {
        ["INR"] = ("Rupees", "Paise"),
        ["USD"] = ("Dollars", "Cents"),
        ["EUR"] = ("Euros", "Cents"),
        ["GBP"] = ("Pounds", "Pence"),
        ["AED"] = ("Dirhams", "Fils"),
    };

    public static string Convert(decimal amount, string currencyCode)
    {
        if (amount < 0)
            amount = 0; // A negative total should never reach the PDF layer - never display "Minus".

        var rounded = Math.Round(amount, 2, MidpointRounding.AwayFromZero);
        var wholePart = (long)Math.Truncate(rounded);
        var fractionPart = (int)Math.Round((rounded - wholePart) * 100m, 0, MidpointRounding.AwayFromZero);

        var (majorUnit, minorUnit) = UnitNames.TryGetValue(
            (currencyCode ?? string.Empty).Trim().ToUpperInvariant(),
            out var units)
            ? units
            : (currencyCode ?? "Amount", "Cents");

        var words = new StringBuilder();
        words.Append(majorUnit).Append(' ').Append(ConvertWholeNumber(wholePart));

        if (fractionPart > 0)
        {
            words.Append(" and ").Append(TwoDigitWords(fractionPart)).Append(' ').Append(minorUnit);
        }

        words.Append(" Only");

        return words.ToString();
    }

    private static string ConvertWholeNumber(long value)
    {
        if (value == 0)
            return Ones[0];

        // Indian grouping: the last 3 digits form one group, then every
        // group above that is 2 digits (thousand, lakh, crore, arab,
        // kharab) - unlike the international 3-3-3 grouping.
        var hundreds = (int)(value % 1000); value /= 1000;
        var thousands = (int)(value % 100); value /= 100;
        var lakhs = (int)(value % 100); value /= 100;
        var crores = (int)(value % 100); value /= 100;
        var arabs = (int)(value % 100); value /= 100;
        var kharabs = (int)(value % 100);

        var parts = new List<string>();

        if (kharabs > 0) parts.Add($"{TwoDigitWords(kharabs)} Kharab");
        if (arabs > 0) parts.Add($"{TwoDigitWords(arabs)} Arab");
        if (crores > 0) parts.Add($"{TwoDigitWords(crores)} Crore");
        if (lakhs > 0) parts.Add($"{TwoDigitWords(lakhs)} Lakh");
        if (thousands > 0) parts.Add($"{TwoDigitWords(thousands)} Thousand");
        if (hundreds > 0) parts.Add(ThreeDigitWords(hundreds));

        return string.Join(' ', parts);
    }

    private static string ThreeDigitWords(int value)
    {
        if (value < 20)
            return Ones[value];

        if (value < 100)
            return TwoDigitWords(value);

        var hundredDigit = value / 100;
        var remainder = value % 100;

        return remainder == 0
            ? $"{Ones[hundredDigit]} Hundred"
            : $"{Ones[hundredDigit]} Hundred {TwoDigitWords(remainder)}";
    }

    private static string TwoDigitWords(int value)
    {
        if (value < 20)
            return Ones[value];

        var tensDigit = value / 10;
        var onesDigit = value % 10;

        return onesDigit == 0
            ? Tens[tensDigit]
            : $"{Tens[tensDigit]}-{Ones[onesDigit]}";
    }

    // "₹1,18,000.00" - Indian digit grouping via the "en-IN" culture,
    // which .NET already knows how to format (no custom grouping logic
    // needed here, unlike the words conversion above).
    public static string FormatCurrency(decimal amount, string currencyCode)
    {
        var symbol = (currencyCode ?? string.Empty).Trim().ToUpperInvariant() switch
        {
            "INR" => "₹",
            "USD" => "$",
            "EUR" => "€",
            "GBP" => "£",
            _ => (currencyCode ?? string.Empty) + " "
        };

        var enIn = CultureInfo.GetCultureInfo("en-IN");
        return symbol + amount.ToString("N2", enIn);
    }
}
