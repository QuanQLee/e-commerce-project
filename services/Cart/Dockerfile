FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Cart.csproj", "."]
<<<<<<< HEAD
RUN dotnet restore "./Cart.csproj"
=======
RUN dotnet nuget add source https://mirrors.tuna.tsinghua.edu.cn/nuget/nuget/index.json -n tsinghua \
    && dotnet restore "./Cart.csproj" --source https://mirrors.tuna.tsinghua.edu.cn/nuget/nuget/index.json
>>>>>>> 160da764ba24c318f26e70dcceb86e4100e8d2f1
COPY . .
RUN dotnet build "Cart.csproj" -c Release -o /app/build
RUN dotnet publish "Cart.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Cart.dll"]
