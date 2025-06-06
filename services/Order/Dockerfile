FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Order.csproj", "."]
RUN dotnet restore "./Order.csproj"
COPY . .
RUN dotnet build "Order.csproj" -c Release -o /app/build
RUN dotnet publish "Order.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Order.dll"]
