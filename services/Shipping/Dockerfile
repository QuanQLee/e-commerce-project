FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Shipping.csproj", "."]
RUN dotnet restore "./Shipping.csproj"
COPY . .
RUN dotnet build "Shipping.csproj" -c Release -o /app/build
RUN dotnet publish "Shipping.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Shipping.dll"]
