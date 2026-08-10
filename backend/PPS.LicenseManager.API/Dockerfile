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

RUN useradd --uid 1500 --create-home appuser
USER appuser

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

COPY --from=build --chown=appuser:appuser /app/publish .

ENTRYPOINT ["dotnet", "PPS.LicenseManager.API.dll"]
