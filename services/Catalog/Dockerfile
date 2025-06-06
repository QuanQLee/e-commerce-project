FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Catalog.csproj", "."]
RUN dotnet restore "./Catalog.csproj"
COPY . .
RUN dotnet build "Catalog.csproj" -c Release -o /app/build
RUN dotnet publish "Catalog.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
RUN ls -al /app     # <-- 关键调试！加一行查看构建后目录内容
ENTRYPOINT ["dotnet", "Catalog.dll"]
