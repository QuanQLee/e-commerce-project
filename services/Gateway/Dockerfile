FROM kong:3.6-alpine
COPY kong.yml /kong/kong.yml
ENV KONG_DATABASE=off
ENV KONG_DECLARATIVE_CONFIG=/kong/kong.yml
ENV KONG_PLUGINS=bundled
CMD ["kong", "docker-start"]
