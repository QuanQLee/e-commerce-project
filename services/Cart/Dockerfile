FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Cart.csproj", "."]
RUN dotnet nuget add source https://nuget.aliyun.com/repository/nuget/v3/index.json -n aliyun \
    && dotnet restore "./Cart.csproj" \
        --source https://nuget.aliyun.com/repository/nuget/v3/index.json
COPY . .
RUN dotnet build "Cart.csproj" -c Release -o /app/build
RUN dotnet publish "Cart.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Cart.dll"]
