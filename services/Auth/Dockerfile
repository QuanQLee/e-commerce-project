FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Auth.csproj ./

RUN dotnet restore "Auth.csproj" \
    --source https://api.nuget.org/v3/index.json \
    --disable-parallel

COPY . ./
RUN dotnet publish "Auth.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1 \
    ASPNETCORE_ENVIRONMENT=Production \
    PORT=8080

EXPOSE 8080
ENTRYPOINT ["dotnet", "Auth.dll"]


