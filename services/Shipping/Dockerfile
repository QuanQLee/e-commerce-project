FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Shipping.csproj ./
RUN dotnet restore "Shipping.csproj" --source https://api.nuget.org/v3/index.json --disable-parallel

COPY . .
RUN dotnet publish "Shipping.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
EXPOSE 80
COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "Shipping.dll"]
