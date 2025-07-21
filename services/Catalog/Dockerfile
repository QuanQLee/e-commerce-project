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

ENTRYPOINT ["dotnet", "Catalog.dll"]