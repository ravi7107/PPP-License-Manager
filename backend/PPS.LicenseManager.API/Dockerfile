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
USER appuser

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

COPY --from=build --chown=appuser:appuser /app/publish .

ENTRYPOINT ["dotnet", "PPS.LicenseManager.API.dll"]
