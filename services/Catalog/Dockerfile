FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["Catalog.csproj", "./"]

RUN dotnet restore "Catalog.csproj" --disable-parallel --source https://api.nuget.org/v3/index.json

COPY . .
RUN dotnet publish "Catalog.csproj" \
    -c Release \
    -o /app/publish \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1 \
    PORT=8080

EXPOSE 8080

USER app

ENTRYPOINT ["dotnet", "Catalog.dll"]
