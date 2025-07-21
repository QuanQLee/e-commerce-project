FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Order/Order.csproj ./Order.csproj
RUN dotnet restore "Order.csproj" \
    --source https://api.nuget.org/v3/index.json \
    --disable-parallel

COPY Order/. ./
RUN dotnet publish "Order.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 80
ENTRYPOINT ["dotnet", "Order.dll"]
