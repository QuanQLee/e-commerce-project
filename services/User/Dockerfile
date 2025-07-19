FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["User.csproj", "."]
RUN dotnet nuget add source https://mirrors.tuna.tsinghua.edu.cn/nuget/nuget/index.json -n tsinghua \
    && dotnet restore "./User.csproj" --source https://mirrors.tuna.tsinghua.edu.cn/nuget/nuget/index.json
COPY . .
RUN dotnet build "User.csproj" -c Release -o /app/build
RUN dotnet publish "User.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "User.dll"]
