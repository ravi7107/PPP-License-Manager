namespace PPS.LicenseManager.API.Services.Utilization;

/*
 * The fixed set of normalized fields every vendor's utilization export
 * gets mapped onto (see UtilizationFact). This list - not the schema - is
 * what stays vendor-agnostic: onboarding a new vendor means adding a new
 * synonym set / mapping profile that projects onto these same fields,
 * never adding new fields shaped around one vendor's export.
 *
 * The synonym table is seeded from a real Autodesk Account usage export
 * header row (hashed_autodesk_id, first_name, last_name, email,
 * autodesk_id, team_alias, group, offering_name, version,
 * seat_assignment, assigned_date, unassigned_date, user_activity,
 * days_inactive, access_option, days_used, monthly_average, tokens_used,
 * last_accessed) plus generic guesses for other vendors, and is used only
 * to SUGGEST a mapping - the admin always confirms or overrides it before
 * a batch can be processed (see UtilizationUploadController.SaveMapping).
 */
public static class UtilizationNormalizedFields
{
    public const string RawUserIdentifier = "RawUserIdentifier";
    public const string RawUserDisplayName = "RawUserDisplayName";
    public const string RawSoftwareText = "RawSoftwareText";
    public const string RawDepartmentText = "RawDepartmentText";
    public const string RawLocationText = "RawLocationText";
    public const string LastUsedDate = "LastUsedDate";
    public const string DaysUsedInPeriod = "DaysUsedInPeriod";
    public const string MonthlyAverageUsage = "MonthlyAverageUsage";
    public const string VersionUsed = "VersionUsed";
    public const string AssignedFlag = "AssignedFlag";
    public const string RawStatusText = "RawStatusText";

    // RawUserIdentifier and RawSoftwareText are the only two fields a
    // batch cannot be processed without - every KPI needs "who" and
    // "what product", even when usage-evidence fields are missing (that
    // just makes the row unusable for calculation, not unmappable).
    public static readonly string[] RequiredFields =
    {
        RawUserIdentifier,
        RawSoftwareText,
    };

    public static readonly string[] AllFields =
    {
        RawUserIdentifier,
        RawUserDisplayName,
        RawSoftwareText,
        RawDepartmentText,
        RawLocationText,
        LastUsedDate,
        DaysUsedInPeriod,
        MonthlyAverageUsage,
        VersionUsed,
        AssignedFlag,
        RawStatusText,
    };

    private static readonly Dictionary<string, string[]> Synonyms = new()
    {
        // Deliberately excludes vendor-internal/hashed ID columns (e.g.
        // Autodesk's own "autodesk_id"/"hashed_autodesk_id") even though
        // they uniquely identify a user in the vendor's system - they
        // can never be matched against this app's own Users.Email or
        // Users.FullName (see UtilizationUploadService's reconciliation
        // logic), so suggesting one here would just produce a
        // confidently-wrong mapping instead of an honest "unmapped".
        [RawUserIdentifier] = new[]
        {
            "email", "user", "username", "user name", "user id", "userid",
            "assigned to",
        },
        [RawUserDisplayName] = new[]
        {
            "first_name", "firstname", "first name", "name", "full name",
            "display name", "user name",
        },
        [RawSoftwareText] = new[]
        {
            "offering_name", "offering", "product", "product name",
            "software", "software name", "collection",
        },
        [RawDepartmentText] = new[]
        {
            "team_alias", "team", "department", "dept", "group", "cost center",
        },
        [RawLocationText] = new[]
        {
            "location", "office", "office location", "site", "region",
        },
        [LastUsedDate] = new[]
        {
            "last_accessed", "last accessed", "last used", "last used date",
            "last login", "last active",
        },
        [DaysUsedInPeriod] = new[]
        {
            "days_used", "days used", "usage days", "active days",
        },
        [MonthlyAverageUsage] = new[]
        {
            "monthly_average", "monthly average", "avg monthly usage",
            "average monthly usage",
        },
        [VersionUsed] = new[]
        {
            "version", "version used", "product version",
        },
        [AssignedFlag] = new[]
        {
            "seat_assignment", "seat assignment", "assigned", "assignment status",
        },
        [RawStatusText] = new[]
        {
            "user_activity", "user activity", "status", "access_option",
            "access option",
        },
    };

    // Lowercase, trim, and collapse anything that isn't a letter/digit
    // into a single space - "Last Accessed", "last_accessed" and
    // "LastAccessed" all normalize the same way, which is what lets the
    // synonym table above stay short and vendor-agnostic rather than
    // needing every literal casing/punctuation variant spelled out.
    public static string Normalize(string header)
    {
        var chars = header.Trim().ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : ' ')
            .ToArray();

        var collapsed = new string(chars);

        while (collapsed.Contains("  "))
        {
            collapsed = collapsed.Replace("  ", " ");
        }

        return collapsed.Trim();
    }

    // Returns, for each source column, the best-guess normalized field it
    // maps to (or null if nothing matched confidently). A source column
    // only ever suggests one normalized field, and each normalized field
    // is only suggested once (first confident match wins) - ambiguous
    // columns are left for the admin to resolve manually rather than
    // guessed twice.
    public static Dictionary<string, string?> SuggestMapping(IEnumerable<string> sourceColumns)
    {
        var columns = sourceColumns.ToList();
        var normalizedColumns = columns.ToDictionary(c => c, Normalize);

        var suggestions = AllFields.ToDictionary(f => f, _ => (string?)null);
        var claimedColumns = new HashSet<string>();

        foreach (var field in AllFields)
        {
            if (!Synonyms.TryGetValue(field, out var synonyms))
            {
                continue;
            }

            // Synonyms are written in their natural vendor-column spelling
            // (e.g. "offering_name") for readability, not pre-normalized -
            // normalize each one here so an underscore/space/case variant
            // in the synonym list still matches a header normalized the
            // same way "offering_name" -> "offering name" is. Without
            // this, any synonym containing an underscore or mixed case
            // would silently never match, since Normalize() never
            // produces underscores or capitals for it to equal against.
            var match = columns.FirstOrDefault(c =>
                !claimedColumns.Contains(c) &&
                synonyms.Any(s => Normalize(s) == normalizedColumns[c]));

            if (match != null)
            {
                suggestions[field] = match;
                claimedColumns.Add(match);
            }
        }

        return suggestions;
    }
}
