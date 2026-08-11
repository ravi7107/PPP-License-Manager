# ---- Build stage ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY PPS.LicenseManager.API.csproj ./
RUN dotnet restore "PPS.LicenseManager.API.csproj"

COPY . .
RUN dotnet publish "PPS.LicenseManager.API.csproj" -c Release -o /app/publish --no-restore

# ---- Runtime stage ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Purchase Requisition PDF generation (QuestPDF, via SkiaSharp) needs a
# real font available on disk - this slim base image ships neither
# fontconfig nor any font files, which otherwise fails PDF generation at
# runtime with a SkiaSharp/FontManager exception. This is a well-known
# QuestPDF-in-Docker gotcha (see https://github.com/QuestPDF/QuestPDF/issues/700
# and https://github.com/QuestPDF/QuestPDF/issues/1406) - fonts-dejavu-core
# is a small, freely redistributable font family with solid Latin/Unicode
# coverage, enough for the plain English/numeric text this app renders.
RUN apt-get update \
    && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --uid 1500 --create-home appuser

# /app/App_Data is where the Purchase Requisition PDFs are written
# (see docker-compose.yml's backend_pdfs named volume, mounted here) - it
# must exist and be owned by appuser *before* that volume is first
# mounted. Docker seeds a brand-new named volume's contents from whatever
# is already on disk at the mount point inside the image at the time of
# first use, ownership included; without this, a freshly-created volume
# comes up owned by root while the container itself runs as appuser
# (below), and PDF generation fails with
# System.UnauthorizedAccessException: Access to the path
# '/app/App_Data/purchase-requisitions' is denied.
RUN mkdir -p /app/App_Data && chown -R appuser:appuser /app/App_Data

USER appuser

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

COPY --from=build --chown=appuser:appuser /app/publish .

ENTRYPOINT ["dotnet", "PPS.LicenseManager.API.dll"]
