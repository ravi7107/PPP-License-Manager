using System.Xml;
using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.OfficeLocation;
using PPS.LicenseManager.API.Enums;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Services;

public class OfficeLocationService : IOfficeLocationService
{
    private readonly ApplicationDbContext _context;

    public OfficeLocationService(ApplicationDbContext context)
    {
        _context = context;
    }

    // =========================================================
    // LOCATIONS
    // =========================================================

    public async Task<IEnumerable<OfficeLocationResponse>>
        GetLocationsAsync()
    {
        return await _context.OfficeLocations
            .AsNoTracking()
            .Include(x => x.Company)
            .Include(x => x.Floors)
            .OrderBy(x => x.Company.Name)
            .ThenBy(x => x.LocationName)
            .Select(x => MapLocation(x))
            .ToListAsync();
    }

    public async Task<IEnumerable<OfficeLocationResponse>>
        GetLocationsByCompanyAsync(int companyId)
    {
        return await _context.OfficeLocations
            .AsNoTracking()
            .Include(x => x.Company)
            .Include(x => x.Floors)
            .Where(x => x.CompanyId == companyId)
            .OrderBy(x => x.LocationName)
            .Select(x => MapLocation(x))
            .ToListAsync();
    }

    public async Task<OfficeLocationResponse?>
        GetLocationByIdAsync(int id)
    {
        var record = await _context.OfficeLocations
            .AsNoTracking()
            .Include(x => x.Company)
            .Include(x => x.Floors)
            .FirstOrDefaultAsync(x => x.Id == id);

        return record == null
            ? null
            : MapLocation(record);
    }

    public async Task<OfficeLocationResponse>
        CreateLocationAsync(
            CreateOfficeLocationRequest request)
    {
        var companyExists = await _context.Companies
            .AnyAsync(x =>
                x.Id == request.CompanyId &&
                x.IsActive);

        if (!companyExists)
            throw new InvalidOperationException(
                "Selected entity does not exist or is inactive.");

        var code = request.LocationCode.Trim();
        var name = request.LocationName.Trim();

        if (string.IsNullOrWhiteSpace(code))
            throw new InvalidOperationException(
                "Location code is required.");

        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException(
                "Location name is required.");

        var duplicate = await _context.OfficeLocations
            .AnyAsync(x =>
                x.CompanyId == request.CompanyId &&
                x.LocationCode.ToLower() == code.ToLower());

        if (duplicate)
            throw new InvalidOperationException(
                "Location code already exists for this entity.");

        var record = new OfficeLocation
        {
            CompanyId = request.CompanyId,
            LocationCode = code,
            LocationName = name,
            Address = Clean(request.Address),
            City = Clean(request.City),
            State = Clean(request.State),
            Country = string.IsNullOrWhiteSpace(request.Country)
                ? "India"
                : request.Country.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.OfficeLocations.Add(record);

        await _context.SaveChangesAsync();

        return await GetLocationByIdAsync(record.Id)
            ?? throw new Exception(
                "Unable to load created office location.");
    }

    public async Task<OfficeLocationResponse?>
        UpdateLocationAsync(
            int id,
            UpdateOfficeLocationRequest request)
    {
        var record = await _context.OfficeLocations
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return null;

        var companyExists = await _context.Companies
            .AnyAsync(x =>
                x.Id == request.CompanyId &&
                x.IsActive);

        if (!companyExists)
            throw new InvalidOperationException(
                "Selected entity does not exist or is inactive.");

        var code = request.LocationCode.Trim();
        var name = request.LocationName.Trim();

        if (string.IsNullOrWhiteSpace(code))
            throw new InvalidOperationException(
                "Location code is required.");

        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException(
                "Location name is required.");

        var duplicate = await _context.OfficeLocations
            .AnyAsync(x =>
                x.Id != id &&
                x.CompanyId == request.CompanyId &&
                x.LocationCode.ToLower() == code.ToLower());

        if (duplicate)
            throw new InvalidOperationException(
                "Location code already exists for this entity.");

        // Do not move an existing office to another entity if
        // it already contains floors/seats tied to departments.
        if (record.CompanyId != request.CompanyId)
        {
            var hasSeats = await _context.OfficeSeats
                .AnyAsync(x =>
                    x.OfficeFloor.OfficeLocationId == id);

            if (hasSeats)
                throw new InvalidOperationException(
                    "Office entity cannot be changed after seats have been created.");
        }

        record.CompanyId = request.CompanyId;
        record.LocationCode = code;
        record.LocationName = name;
        record.Address = Clean(request.Address);
        record.City = Clean(request.City);
        record.State = Clean(request.State);
        record.Country =
            string.IsNullOrWhiteSpace(request.Country)
                ? "India"
                : request.Country.Trim();
        record.IsActive = request.IsActive;
        record.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetLocationByIdAsync(id);
    }

    public async Task<bool>
        DeleteLocationAsync(int id)
    {
        var record = await _context.OfficeLocations
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return false;

        record.IsActive = false;
        record.UpdatedAt = DateTime.UtcNow;

        // Deactivate child floors and seats as well.
        var floors = await _context.OfficeFloors
            .Where(x => x.OfficeLocationId == id)
            .ToListAsync();

        foreach (var floor in floors)
        {
            floor.IsActive = false;
            floor.UpdatedAt = DateTime.UtcNow;
        }

        var seats = await _context.OfficeSeats
            .Where(x =>
                x.OfficeFloor.OfficeLocationId == id)
            .ToListAsync();

        foreach (var seat in seats)
        {
            seat.IsActive = false;
            seat.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return true;
    }

    // =========================================================
    // FLOORS
    // =========================================================

    public async Task<IEnumerable<OfficeFloorResponse>>
        GetFloorsAsync()
    {
        var records = await _context.OfficeFloors
            .AsNoTracking()
            .Include(x => x.OfficeLocation)
                .ThenInclude(x => x.Company)
            .Include(x => x.Seats)
            .OrderBy(x => x.OfficeLocation.LocationName)
            .ThenBy(x => x.SortOrder)
            .ThenBy(x => x.FloorName)
            .ToListAsync();

        return records.Select(MapFloor);
    }

    public async Task<IEnumerable<OfficeFloorResponse>>
        GetFloorsByLocationAsync(int officeLocationId)
    {
        var records = await _context.OfficeFloors
            .AsNoTracking()
            .Include(x => x.OfficeLocation)
                .ThenInclude(x => x.Company)
            .Include(x => x.Seats)
            .Where(x =>
                x.OfficeLocationId == officeLocationId)
            .OrderBy(x => x.SortOrder)
            .ThenBy(x => x.FloorName)
            .ToListAsync();

        return records.Select(MapFloor);
    }

    public async Task<OfficeFloorResponse?>
        GetFloorByIdAsync(int id)
    {
        var record = await _context.OfficeFloors
            .AsNoTracking()
            .Include(x => x.OfficeLocation)
                .ThenInclude(x => x.Company)
            .Include(x => x.Seats)
            .FirstOrDefaultAsync(x => x.Id == id);

        return record == null
            ? null
            : MapFloor(record);
    }

    public async Task<OfficeFloorResponse>
        CreateFloorAsync(
            CreateOfficeFloorRequest request)
    {
        var location = await _context.OfficeLocations
            .Include(x => x.Company)
            .FirstOrDefaultAsync(x =>
                x.Id == request.OfficeLocationId);

        if (location == null || !location.IsActive)
            throw new InvalidOperationException(
                "Selected office location does not exist or is inactive.");

        if (!location.Company.IsActive)
            throw new InvalidOperationException(
                "The entity for this office is inactive.");

        var code = request.FloorCode.Trim();
        var name = request.FloorName.Trim();

        if (string.IsNullOrWhiteSpace(code))
            throw new InvalidOperationException(
                "Floor code is required.");

        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException(
                "Floor name is required.");

        var duplicate = await _context.OfficeFloors
            .AnyAsync(x =>
                x.OfficeLocationId ==
                    request.OfficeLocationId &&
                x.FloorCode.ToLower() ==
                    code.ToLower());

        if (duplicate)
            throw new InvalidOperationException(
                "Floor code already exists for this office.");

        var record = new OfficeFloor
        {
            OfficeLocationId = request.OfficeLocationId,
            FloorCode = code,
            FloorName = name,
            SortOrder = request.SortOrder,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.OfficeFloors.Add(record);

        await _context.SaveChangesAsync();

        return await GetFloorByIdAsync(record.Id)
            ?? throw new Exception(
                "Unable to load created office floor.");
    }

    public async Task<OfficeFloorResponse?>
        UpdateFloorAsync(
            int id,
            UpdateOfficeFloorRequest request)
    {
        var record = await _context.OfficeFloors
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return null;

        var location = await _context.OfficeLocations
            .Include(x => x.Company)
            .FirstOrDefaultAsync(x =>
                x.Id == request.OfficeLocationId);

        if (location == null || !location.IsActive)
            throw new InvalidOperationException(
                "Selected office location does not exist or is inactive.");

        var code = request.FloorCode.Trim();
        var name = request.FloorName.Trim();

        if (string.IsNullOrWhiteSpace(code) ||
            string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException(
                "Floor code and floor name are required.");

        var duplicate = await _context.OfficeFloors
            .AnyAsync(x =>
                x.Id != id &&
                x.OfficeLocationId ==
                    request.OfficeLocationId &&
                x.FloorCode.ToLower() ==
                    code.ToLower());

        if (duplicate)
            throw new InvalidOperationException(
                "Floor code already exists for this office.");

        if (record.OfficeLocationId !=
            request.OfficeLocationId)
        {
            var hasSeats = await _context.OfficeSeats
                .AnyAsync(x =>
                    x.OfficeFloorId == id);

            if (hasSeats)
                throw new InvalidOperationException(
                    "Floor cannot be moved to another office after seats have been created.");
        }

        record.OfficeLocationId =
            request.OfficeLocationId;
        record.FloorCode = code;
        record.FloorName = name;
        record.SortOrder = request.SortOrder;
        record.IsActive = request.IsActive;
        record.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetFloorByIdAsync(id);
    }

    public async Task<bool>
        DeleteFloorAsync(int id)
    {
        var record = await _context.OfficeFloors
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return false;

        record.IsActive = false;
        record.UpdatedAt = DateTime.UtcNow;

        var seats = await _context.OfficeSeats
            .Where(x => x.OfficeFloorId == id)
            .ToListAsync();

        foreach (var seat in seats)
        {
            seat.IsActive = false;
            seat.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        return true;
    }

    // =========================================================
    // FLOOR MAP
    // =========================================================

    public async Task<OfficeFloorResponse?>
        UploadFloorMapAsync(
            int id,
            IFormFile file,
            string webRootPath)
    {
        var floor = await _context.OfficeFloors
            .Include(x => x.OfficeLocation)
                .ThenInclude(x => x.Company)
            .Include(x => x.Seats)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (floor == null)
            return null;

        if (file == null || file.Length == 0)
            throw new InvalidOperationException(
                "Please select a floor map image.");

        const long maxFileSize = 10 * 1024 * 1024;

        if (file.Length > maxFileSize)
            throw new InvalidOperationException(
                "Floor map must not exceed 10 MB.");

        var extension =
            Path.GetExtension(file.FileName).ToLowerInvariant();

        var allowedExtensions = new[]
        {
            ".png",
            ".jpg",
            ".jpeg",
            ".svg"
        };

        if (!allowedExtensions.Contains(extension))
            throw new InvalidOperationException(
                "Only PNG, JPEG, and SVG floor maps are allowed.");

        var isSvg = extension == ".svg";

        var isPng = false;
        var isJpeg = false;
        byte[]? sanitizedSvgBytes = null;

        if (isSvg)
        {
            byte[] rawBytes;

            using (var memory = new MemoryStream())
            {
                await file.CopyToAsync(memory);
                rawBytes = memory.ToArray();
            }

            // SVG is XML and can carry <script> tags, event-handler
            // attributes, or embedded HTML via <foreignObject> - all of
            // which would run if the file were ever rendered inline in
            // the page. Validate it's well-formed SVG and strip anything
            // capable of executing script before it's ever written to disk.
            sanitizedSvgBytes = SanitizeSvg(rawBytes);
        }
        else
        {
            // Verify the actual file signature instead of trusting
            // only the extension or browser-supplied content type.
            byte[] header = new byte[8];

            using (var stream = file.OpenReadStream())
            {
                var bytesRead =
                    await stream.ReadAsync(
                        header.AsMemory(0, header.Length));

                if (bytesRead < 3)
                    throw new InvalidOperationException(
                        "The uploaded image is invalid.");
            }

            isPng =
                header.Length >= 8 &&
                header[0] == 0x89 &&
                header[1] == 0x50 &&
                header[2] == 0x4E &&
                header[3] == 0x47 &&
                header[4] == 0x0D &&
                header[5] == 0x0A &&
                header[6] == 0x1A &&
                header[7] == 0x0A;

            isJpeg =
                header[0] == 0xFF &&
                header[1] == 0xD8 &&
                header[2] == 0xFF;

            if (!isPng && !isJpeg)
                throw new InvalidOperationException(
                    "The uploaded file is not a valid PNG or JPEG image.");

            if (extension == ".png" && !isPng)
                throw new InvalidOperationException(
                    "The file extension does not match the image format.");

            if ((extension == ".jpg" || extension == ".jpeg") &&
                !isJpeg)
                throw new InvalidOperationException(
                    "The file extension does not match the image format.");
        }

        var uploadDirectory =
            Path.Combine(
                webRootPath,
                "uploads",
                "floor-maps");

        Directory.CreateDirectory(uploadDirectory);

        var storedExtension =
            isSvg ? ".svg" : (isPng ? ".png" : ".jpg");

        var generatedFileName =
            $"{Guid.NewGuid():N}{storedExtension}";

        var destination =
            Path.Combine(
                uploadDirectory,
                generatedFileName);

        await using (var output =
            new FileStream(
                destination,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None))
        {
            if (isSvg)
            {
                await output.WriteAsync(sanitizedSvgBytes!);
            }
            else
            {
                await file.CopyToAsync(output);
            }
        }

        // Delete the previous physical map only after
        // the replacement has been written successfully.
        if (!string.IsNullOrWhiteSpace(floor.MapImagePath))
        {
            var relativeOldPath =
                floor.MapImagePath
                    .TrimStart('/')
                    .Replace('/', Path.DirectorySeparatorChar);

            var oldPath =
                Path.Combine(webRootPath, relativeOldPath);

            if (File.Exists(oldPath) &&
                !string.Equals(
                    oldPath,
                    destination,
                    StringComparison.OrdinalIgnoreCase))
            {
                File.Delete(oldPath);
            }
        }

        floor.MapImagePath =
            $"/uploads/floor-maps/{generatedFileName}";

        floor.MapOriginalFileName =
            Path.GetFileName(file.FileName);

        floor.MapContentType =
            isSvg ? "image/svg+xml" : (isPng ? "image/png" : "image/jpeg");

        // Width/height will be populated by the visual map editor
        // from the browser's decoded image dimensions.
        floor.MapWidth = null;
        floor.MapHeight = null;

        floor.UpdatedAt = DateTime.UtcNow;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch
        {
            // Avoid leaving a new orphaned file if DB save fails.
            if (File.Exists(destination))
                File.Delete(destination);

            throw;
        }

        return MapFloor(floor);
    }

    // Validates that the uploaded bytes are well-formed SVG (an <svg> root
    // element, no DTD/external entities) and strips anything capable of
    // executing script - <script> elements, <foreignObject> (can embed
    // arbitrary HTML), "on*" event-handler attributes, and javascript:
    // URIs - before the file is ever written to disk.
    private static byte[] SanitizeSvg(byte[] rawBytes)
    {
        XDocument document;

        try
        {
            using var input = new MemoryStream(rawBytes);

            var readerSettings = new XmlReaderSettings
            {
                DtdProcessing = DtdProcessing.Prohibit,
                XmlResolver = null
            };

            using var reader = XmlReader.Create(input, readerSettings);
            document = XDocument.Load(reader, LoadOptions.None);
        }
        catch
        {
            throw new InvalidOperationException(
                "The uploaded file is not a valid SVG image.");
        }

        var root = document.Root;

        if (root == null ||
            !string.Equals(
                root.Name.LocalName,
                "svg",
                StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                "The uploaded file is not a valid SVG image.");
        }

        var elementsToStrip = document.Descendants()
            .Where(e =>
                string.Equals(
                    e.Name.LocalName, "script",
                    StringComparison.OrdinalIgnoreCase) ||
                string.Equals(
                    e.Name.LocalName, "foreignObject",
                    StringComparison.OrdinalIgnoreCase))
            .ToList();

        foreach (var element in elementsToStrip)
        {
            element.Remove();
        }

        foreach (var element in document.Descendants().ToList())
        {
            var attributesToStrip = element.Attributes()
                .Where(a =>
                    a.Name.LocalName.StartsWith(
                        "on", StringComparison.OrdinalIgnoreCase) ||
                    a.Value.TrimStart().StartsWith(
                        "javascript:", StringComparison.OrdinalIgnoreCase))
                .ToList();

            foreach (var attribute in attributesToStrip)
            {
                attribute.Remove();
            }
        }

        using var output = new MemoryStream();
        document.Save(output, SaveOptions.DisableFormatting);

        return output.ToArray();
    }


    public async Task<bool>
        RemoveFloorMapAsync(
            int id,
            string webRootPath)
    {
        var floor = await _context.OfficeFloors
            .FirstOrDefaultAsync(x => x.Id == id);

        if (floor == null)
            return false;

        var existingMapPath = floor.MapImagePath;

        floor.MapImagePath = null;
        floor.MapOriginalFileName = null;
        floor.MapContentType = null;
        floor.MapWidth = null;
        floor.MapHeight = null;
        floor.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(existingMapPath))
        {
            var relativePath =
                existingMapPath
                    .TrimStart('/')
                    .Replace('/', Path.DirectorySeparatorChar);

            var physicalPath =
                Path.Combine(webRootPath, relativePath);

            if (File.Exists(physicalPath))
                File.Delete(physicalPath);
        }

        return true;
    }


    // =========================================================
    // SEATS
    // =========================================================

    public async Task<IEnumerable<OfficeSeatResponse>>
        GetSeatsAsync()
    {
        var records = await SeatQuery()
            .OrderBy(x =>
                x.OfficeFloor.OfficeLocation.LocationName)
            .ThenBy(x => x.OfficeFloor.SortOrder)
            .ThenBy(x => x.SeatCode)
            .ToListAsync();

        return records.Select(MapSeat);
    }

    public async Task<IEnumerable<OfficeSeatResponse>>
        GetSeatsByFloorAsync(int officeFloorId)
    {
        var records = await SeatQuery()
            .Where(x =>
                x.OfficeFloorId == officeFloorId)
            .OrderBy(x => x.SeatCode)
            .ToListAsync();

        return records.Select(MapSeat);
    }

    public async Task<OfficeSeatResponse?>
        GetSeatByIdAsync(int id)
    {
        var record = await SeatQuery()
            .FirstOrDefaultAsync(x => x.Id == id);

        return record == null
            ? null
            : MapSeat(record);
    }

    public async Task<OfficeSeatResponse>
        CreateSeatAsync(
            CreateOfficeSeatRequest request,
            int actingUserId)
    {
        var floor = await GetFloorForValidationAsync(
            request.OfficeFloorId);

        ValidateCoordinates(
            request.XPosition,
            request.YPosition);

        await ValidateDepartmentAsync(
            request.DepartmentId,
            floor.OfficeLocation.CompanyId);

        await ValidateSeatAssignmentAsync(
            request.AssetId,
            request.UserId,
            request.DepartmentId,
            floor.OfficeLocation.CompanyId,
            null);

        var code = request.SeatCode.Trim();
        var name = request.SeatName.Trim();

        if (string.IsNullOrWhiteSpace(code))
            throw new InvalidOperationException(
                "Seat code is required.");

        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException(
                "Seat name is required.");

        var duplicate = await _context.OfficeSeats
            .AnyAsync(x =>
                x.OfficeFloorId ==
                    request.OfficeFloorId &&
                x.SeatCode.ToLower() ==
                    code.ToLower());

        if (duplicate)
            throw new InvalidOperationException(
                "Seat code already exists on this floor.");

        var record = new OfficeSeat
        {
            OfficeFloorId = request.OfficeFloorId,
            SeatCode = code,
            SeatName = name,
            DepartmentId = request.DepartmentId,
            AssetId = request.AssetId,
            UserId = request.UserId,
            XPosition = request.XPosition,
            YPosition = request.YPosition,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        // Phase 12 - the seat row and its downstream Asset/AssetAssignment
        // sync must commit together. Without this, a failure inside
        // SyncAssetFromSeatAsync (e.g. the actingUserId check) would leave
        // an already-committed seat pointing at an asset/user with no
        // matching assignment row - the exact drift this phase exists to
        // prevent, just reintroduced as a partial-failure case.
        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        _context.OfficeSeats.Add(record);

        await _context.SaveChangesAsync();

        // A brand-new seat has no "previous" asset to close out.
        await SyncAssetFromSeatAsync(
            previousAssetId: null,
            newAssetId: request.AssetId,
            newUserId: request.UserId,
            newDepartmentId: request.DepartmentId,
            seatId: record.Id,
            actingUserId: actingUserId);

        await transaction.CommitAsync();

        return await GetSeatByIdAsync(record.Id)
            ?? throw new Exception(
                "Unable to load created office seat.");
    }

    public async Task<OfficeSeatResponse?>
        UpdateSeatAsync(
            int id,
            UpdateOfficeSeatRequest request,
            int actingUserId)
    {
        var record = await _context.OfficeSeats
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return null;

        // Phase 12 - captured before we overwrite it below, so
        // SyncAssetFromSeatAsync can tell whether the seat's asset changed
        // (and close out the previous asset's assignment if so).
        var previousAssetId = record.AssetId;

        var floor = await GetFloorForValidationAsync(
            request.OfficeFloorId);

        ValidateCoordinates(
            request.XPosition,
            request.YPosition);

        await ValidateDepartmentAsync(
            request.DepartmentId,
            floor.OfficeLocation.CompanyId);

        await ValidateSeatAssignmentAsync(
            request.AssetId,
            request.UserId,
            request.DepartmentId,
            floor.OfficeLocation.CompanyId,
            id);

        var code = request.SeatCode.Trim();
        var name = request.SeatName.Trim();

        if (string.IsNullOrWhiteSpace(code) ||
            string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException(
                "Seat code and seat name are required.");

        var duplicate = await _context.OfficeSeats
            .AnyAsync(x =>
                x.Id != id &&
                x.OfficeFloorId ==
                    request.OfficeFloorId &&
                x.SeatCode.ToLower() ==
                    code.ToLower());

        if (duplicate)
            throw new InvalidOperationException(
                "Seat code already exists on this floor.");

        record.OfficeFloorId =
            request.OfficeFloorId;
        record.SeatCode = code;
        record.SeatName = name;
        record.DepartmentId =
            request.DepartmentId;
        record.AssetId =
            request.AssetId;
        record.UserId =
            request.UserId;
        record.XPosition =
            request.XPosition;
        record.YPosition =
            request.YPosition;
        record.IsActive =
            request.IsActive;
        record.UpdatedAt =
            DateTime.UtcNow;

        // Phase 12 - same atomicity reasoning as CreateSeatAsync: the seat
        // row and its downstream Asset/AssetAssignment sync must commit
        // together, not as two independent saves.
        await using var transaction =
            await _context.Database.BeginTransactionAsync();

        await _context.SaveChangesAsync();

        await SyncAssetFromSeatAsync(
            previousAssetId: previousAssetId,
            newAssetId: request.AssetId,
            newUserId: request.UserId,
            newDepartmentId: request.DepartmentId,
            seatId: id,
            actingUserId: actingUserId);

        await transaction.CommitAsync();

        return await GetSeatByIdAsync(id);
    }

    public async Task<bool>
        DeleteSeatAsync(int id)
    {
        var record = await _context.OfficeSeats
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return false;

        record.IsActive = false;
        record.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<OfficeSeatResponse?>
        SetSeatOccupantAsync(
            int seatId,
            int? assetId,
            int? userId)
    {
        var record = await _context.OfficeSeats
            .Include(x => x.OfficeFloor)
                .ThenInclude(x => x.OfficeLocation)
            .FirstOrDefaultAsync(x => x.Id == seatId);

        if (record == null)
            return null;

        await ValidateSeatAssignmentAsync(
            assetId,
            userId,
            record.DepartmentId,
            record.OfficeFloor.OfficeLocation.CompanyId,
            seatId);

        record.AssetId = assetId;
        record.UserId = userId;
        record.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetSeatByIdAsync(seatId);
    }

    // =========================================================
    // PHASE 12 - MAP <-> ASSET WRITE-THROUGH SYNC
    // =========================================================

    // Keeps Asset.DepartmentId and the AssetAssignment table in sync when a
    // seat's Asset/User/Department pairing is edited directly through
    // CreateSeatAsync/UpdateSeatAsync (the Office Locations admin screen).
    //
    // Deliberately NOT called from SetSeatOccupantAsync - that method runs
    // *inside* AssetAssignmentService's own AssignAsync/TransferAsync/
    // ReturnAsync/ReseatAsync transactions, before their own
    // AssetAssignment row is committed. Querying AssetAssignments from in
    // here at that point would see a stale "no active assignment" result
    // (the pending insert isn't visible to a fresh query yet) and could
    // create a second, conflicting active assignment for the same asset -
    // violating the partial unique index that enforces one active
    // assignment per AssetId. AssetAssignmentService already keeps the
    // seat in sync in that direction; this method only ever needs to run
    // for edits that originate on the map side.
    private async Task SyncAssetFromSeatAsync(
        int? previousAssetId,
        int? newAssetId,
        int? newUserId,
        int? newDepartmentId,
        int seatId,
        int actingUserId)
    {
        var now = DateTime.UtcNow;
        var changed = false;

        // The seat no longer points at its previous asset (cleared, or
        // reassigned to a different asset) - that asset isn't occupying
        // this seat anymore, so close out its assignment same as a Return.
        if (previousAssetId.HasValue && previousAssetId != newAssetId)
        {
            var previousActive = await _context.AssetAssignments
                .FirstOrDefaultAsync(a =>
                    a.AssetId == previousAssetId.Value && a.IsActive);

            // Only auto-close if that assignment was actually anchored to
            // THIS seat - if it belongs to a different seat (or none),
            // leave it alone. Otherwise editing an unrelated seat's Asset
            // field could return hardware out from under a holder that
            // this seat edit has nothing to do with.
            if (previousActive != null &&
                previousActive.SeatId == seatId)
            {
                previousActive.IsActive = false;
                previousActive.ReturnedOn = now;
                previousActive.Status = "Returned";
                previousActive.UpdatedAt = now;
                changed = true;

                var previousAsset = await _context.Assets
                    .FirstOrDefaultAsync(x => x.Id == previousAssetId.Value);

                if (previousAsset != null)
                {
                    previousAsset.Status = "Available";
                    previousAsset.IsReadyForAssignment = true;
                    previousAsset.UpdatedAt = now;
                }
            }
        }

        if (!newAssetId.HasValue)
        {
            if (changed)
                await _context.SaveChangesAsync();

            return;
        }

        var asset = await _context.Assets
            .FirstOrDefaultAsync(x => x.Id == newAssetId.Value);

        // Already validated to exist by ValidateSeatAssignmentAsync before
        // this method is ever called - defensive only.
        if (asset == null)
        {
            if (changed)
                await _context.SaveChangesAsync();

            return;
        }

        // Department - the map is authoritative per the business decision
        // this phase implements: push the seat's department onto the
        // asset rather than rejecting the seat save on a mismatch (the
        // mismatch throw this used to be was removed from
        // ValidateSeatAssignmentAsync above).
        if (newDepartmentId.HasValue &&
            asset.DepartmentId != newDepartmentId.Value)
        {
            asset.DepartmentId = newDepartmentId.Value;
            asset.UpdatedAt = now;
            changed = true;
        }

        var activeAssignment = await _context.AssetAssignments
            .FirstOrDefaultAsync(a =>
                a.AssetId == newAssetId.Value && a.IsActive);

        if (newUserId.HasValue)
        {
            if (activeAssignment == null)
            {
                // No current holder - open a new assignment for the
                // seat's occupant, mirroring
                // AssetAssignmentService.AssignAsync's own field-setting.
                await EnsureActingUserExistsAsync(actingUserId);

                _context.AssetAssignments.Add(new AssetAssignment
                {
                    AssetId = newAssetId.Value,
                    UserId = newUserId.Value,
                    AssignedByUserId = actingUserId,
                    AssignedOn = now,
                    Status = "Assigned",
                    Remarks = "Set via Office Floor Map seat edit.",
                    IsActive = true,
                    CreatedAt = now,
                    AssignmentType = AssignmentType.Permanent,
                    SeatId = seatId,
                });

                asset.Status = "Assigned";
                asset.IsReadyForAssignment = false;
                asset.UpdatedAt = now;
                changed = true;
            }
            else if (activeAssignment.UserId != newUserId.Value)
            {
                // Different occupant than the current holder. Only treat
                // this as an in-place reassignment when the existing
                // assignment is already anchored to THIS seat - i.e. the
                // admin is looking at the pairing this screen already
                // shows and simply changing who sits here. If the asset's
                // active assignment belongs to a different seat (or none -
                // e.g. hardware assigned to a remote worker with no seat
                // at all), this edit has no visibility into that holder,
                // so it must not silently reassign their hardware out from
                // under them - block it and point at the dedicated
                // Transfer action instead, same as AssignAsync's own
                // "already assigned" guard.
                if (activeAssignment.SeatId != seatId)
                    throw new InvalidOperationException(
                        "This workstation is already assigned to another user " +
                        "(not via this seat). Use Transfer from the Hardware " +
                        "page to reassign it.");

                // Close the old assignment and open a new one, mirroring
                // AssetAssignmentService.TransferAsync's own pattern.
                await EnsureActingUserExistsAsync(actingUserId);

                activeAssignment.IsActive = false;
                activeAssignment.ReturnedOn = now;
                activeAssignment.Status = "Transferred";
                activeAssignment.UpdatedAt = now;

                _context.AssetAssignments.Add(new AssetAssignment
                {
                    AssetId = newAssetId.Value,
                    UserId = newUserId.Value,
                    AssignedByUserId = actingUserId,
                    AssignedOn = now,
                    Status = "Assigned",
                    Remarks = "Reassigned via Office Floor Map seat edit.",
                    IsActive = true,
                    CreatedAt = now,
                    AssignmentType = AssignmentType.Permanent,
                    OriginalAssignmentId = activeAssignment.Id,
                    SeatId = seatId,
                });

                asset.Status = "Assigned";
                asset.IsReadyForAssignment = false;
                asset.UpdatedAt = now;
                changed = true;
            }

            // else: activeAssignment.UserId already matches newUserId -
            // already in sync (this is also the normal case when this
            // write originated from AssetAssignmentService itself, since
            // that path always sets both sides to match before this
            // method could ever observe them).
        }
        else if (activeAssignment != null && activeAssignment.SeatId == seatId)
        {
            // Seat's occupant was cleared while the asset stays mapped to
            // this seat - treat it as a return, mirroring
            // AssetAssignmentService.ReturnAsync. Same seat-anchoring
            // guard as above - only close an assignment this seat is
            // actually the recorded location for.
            activeAssignment.IsActive = false;
            activeAssignment.ReturnedOn = now;
            activeAssignment.Status = "Returned";
            activeAssignment.UpdatedAt = now;

            asset.Status = "Available";
            asset.IsReadyForAssignment = true;
            asset.UpdatedAt = now;
            changed = true;
        }

        if (changed)
            await _context.SaveChangesAsync();
    }

    // Defensive check mirroring AssetAssignmentService.AssignAsync's own
    // "Assigned By user not found" guard - actingUserId comes from an
    // authenticated admin's JWT claim, but validating it here means a
    // stale/deleted-user token fails with a clear 400 instead of a raw
    // FK-violation 500 once the transaction commits.
    private async Task EnsureActingUserExistsAsync(int actingUserId)
    {
        var exists = await _context.Users
            .AsNoTracking()
            .AnyAsync(x => x.Id == actingUserId);

        if (!exists)
            throw new InvalidOperationException(
                "Acting user could not be verified. Please sign in again.");
    }

    // =========================================================
    // VALIDATION
    // =========================================================

    private async Task<OfficeFloor>
        GetFloorForValidationAsync(int floorId)
    {
        var floor = await _context.OfficeFloors
            .Include(x => x.OfficeLocation)
                .ThenInclude(x => x.Company)
            .FirstOrDefaultAsync(x =>
                x.Id == floorId);

        if (floor == null || !floor.IsActive)
            throw new InvalidOperationException(
                "Selected floor does not exist or is inactive.");

        if (!floor.OfficeLocation.IsActive)
            throw new InvalidOperationException(
                "The office location for this floor is inactive.");

        if (!floor.OfficeLocation.Company.IsActive)
            throw new InvalidOperationException(
                "The entity for this office is inactive.");

        return floor;
    }

    private async Task ValidateDepartmentAsync(
        int? departmentId,
        int companyId)
    {
        if (!departmentId.HasValue)
            return;

        var department = await _context.Departments
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.Id == departmentId.Value);

        if (department == null || !department.IsActive)
            throw new InvalidOperationException(
                "Selected department does not exist or is inactive.");

        if (department.CompanyId != companyId)
            throw new InvalidOperationException(
                "Selected department belongs to a different entity than this office.");
    }

    private async Task ValidateSeatAssignmentAsync(
        int? assetId,
        int? userId,
        int? departmentId,
        int companyId,
        int? currentSeatId)
    {
        // -----------------------------------------------------
        // ASSET / WORKSTATION
        // -----------------------------------------------------
        if (assetId.HasValue)
        {
            var asset = await _context.Assets
                .AsNoTracking()
                .Include(x => x.Department)
                .FirstOrDefaultAsync(x =>
                    x.Id == assetId.Value);

            if (asset == null || !asset.IsActive)
                throw new InvalidOperationException(
                    "Selected workstation does not exist or is inactive.");

            if (asset.Department == null ||
                !asset.Department.IsActive)
                throw new InvalidOperationException(
                    "The workstation department does not exist or is inactive.");

            if (asset.Department.CompanyId != companyId)
                throw new InvalidOperationException(
                    "Selected workstation belongs to a different entity than this office.");

            // Phase 12 - department mismatch used to be a hard error here.
            // Per the business decision that the map is authoritative for
            // an asset's department, a mismatch is no longer rejected -
            // SyncAssetFromSeatAsync below pushes the seat's department
            // onto the asset instead of blocking the save.

            var assetAlreadyMapped =
                await _context.OfficeSeats
                    .AsNoTracking()
                    .AnyAsync(x =>
                        x.IsActive &&
                        x.AssetId == assetId.Value &&
                        (!currentSeatId.HasValue ||
                         x.Id != currentSeatId.Value));

            if (assetAlreadyMapped)
                throw new InvalidOperationException(
                    "Selected workstation is already mapped to another active seat.");
        }

        // -----------------------------------------------------
        // USER
        // -----------------------------------------------------
        if (userId.HasValue)
        {
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x =>
                    x.Id == userId.Value);

            if (user == null || !user.IsActive)
                throw new InvalidOperationException(
                    "Selected user does not exist or is inactive.");

            if (!user.CompanyId.HasValue ||
                user.CompanyId.Value != companyId)
                throw new InvalidOperationException(
                    "Selected user belongs to a different entity than this office.");

            if (departmentId.HasValue &&
                user.DepartmentId != departmentId.Value)
                throw new InvalidOperationException(
                    "Selected user belongs to a different department than this seat.");

            var userAlreadyMapped =
                await _context.OfficeSeats
                    .AsNoTracking()
                    .AnyAsync(x =>
                        x.IsActive &&
                        x.UserId == userId.Value &&
                        (!currentSeatId.HasValue ||
                         x.Id != currentSeatId.Value));

            if (userAlreadyMapped)
                throw new InvalidOperationException(
                    "Selected user is already mapped to another active seat.");
        }
    }


    private static void ValidateCoordinates(
        decimal? x,
        decimal? y)
    {
        if (x.HasValue &&
            (x.Value < 0 || x.Value > 100))
            throw new InvalidOperationException(
                "X position must be between 0 and 100.");

        if (y.HasValue &&
            (y.Value < 0 || y.Value > 100))
            throw new InvalidOperationException(
                "Y position must be between 0 and 100.");
    }

    // =========================================================
    // QUERY / MAPPING
    // =========================================================

    private IQueryable<OfficeSeat> SeatQuery()
    {
        return _context.OfficeSeats
            .AsNoTracking()
            .Include(x => x.Department)
            .Include(x => x.Asset)
            .Include(x => x.User)
            .Include(x => x.OfficeFloor)
                .ThenInclude(x => x.OfficeLocation)
                    .ThenInclude(x => x.Company);
    }

    private static OfficeLocationResponse MapLocation(
        OfficeLocation x)
    {
        return new OfficeLocationResponse
        {
            Id = x.Id,
            CompanyId = x.CompanyId,
            CompanyName = x.Company.Name,
            LocationCode = x.LocationCode,
            LocationName = x.LocationName,
            Address = x.Address,
            City = x.City,
            State = x.State,
            Country = x.Country,
            IsActive = x.IsActive,
            CreatedAt = x.CreatedAt,
            UpdatedAt = x.UpdatedAt,
            FloorCount = x.Floors.Count
        };
    }

    private static OfficeFloorResponse MapFloor(
        OfficeFloor x)
    {
        return new OfficeFloorResponse
        {
            Id = x.Id,
            OfficeLocationId = x.OfficeLocationId,
            OfficeLocationName =
                x.OfficeLocation.LocationName,
            CompanyId =
                x.OfficeLocation.CompanyId,
            CompanyName =
                x.OfficeLocation.Company.Name,
            FloorCode = x.FloorCode,
            FloorName = x.FloorName,
            SortOrder = x.SortOrder,

            MapImagePath = x.MapImagePath,
            MapOriginalFileName = x.MapOriginalFileName,
            MapContentType = x.MapContentType,
            MapWidth = x.MapWidth,
            MapHeight = x.MapHeight,

            IsActive = x.IsActive,
            SeatCount = x.Seats.Count,
            CreatedAt = x.CreatedAt,
            UpdatedAt = x.UpdatedAt
        };
    }

    private static OfficeSeatResponse MapSeat(
        OfficeSeat x)
    {
        return new OfficeSeatResponse
        {
            Id = x.Id,
            OfficeFloorId = x.OfficeFloorId,
            FloorCode = x.OfficeFloor.FloorCode,
            FloorName = x.OfficeFloor.FloorName,
            OfficeLocationId =
                x.OfficeFloor.OfficeLocationId,
            OfficeLocationName =
                x.OfficeFloor.OfficeLocation.LocationName,
            CompanyId =
                x.OfficeFloor.OfficeLocation.CompanyId,
            CompanyName =
                x.OfficeFloor.OfficeLocation.Company.Name,
            SeatCode = x.SeatCode,
            SeatName = x.SeatName,
            DepartmentId = x.DepartmentId,
            DepartmentName =
                x.Department != null
                    ? x.Department.DepartmentName
                    : null,

            AssetId = x.AssetId,
            AssetTag =
                x.Asset != null
                    ? x.Asset.AssetTag
                    : null,
            AssetName =
                x.Asset != null
                    ? x.Asset.AssetName
                    : null,
            HostName =
                x.Asset != null
                    ? x.Asset.HostName
                    : null,

            UserId = x.UserId,
            UserName =
                x.User != null
                    ? x.User.FullName
                    : null,
            EmployeeCode =
                x.User != null
                    ? x.User.EmployeeCode
                    : null,

            XPosition = x.XPosition,
            YPosition = x.YPosition,
            IsActive = x.IsActive,
            CreatedAt = x.CreatedAt,
            UpdatedAt = x.UpdatedAt
        };
    }

    private static string Clean(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim();
    }
}
