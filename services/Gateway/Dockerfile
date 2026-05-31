FROM kong:3

# Copy declarative configuration
COPY kong.yml /kong/kong.yml
COPY render-kong-config.sh /kong/render-kong-config.sh

USER root
RUN chmod 755 /kong/render-kong-config.sh

# Use the bundled nginx user
USER kong

# Set Kong to run in DB-less mode with the provided config
ENV KONG_DATABASE=off \
    KONG_DECLARATIVE_TEMPLATE=/kong/kong.yml \
    KONG_DECLARATIVE_CONFIG=/tmp/kong.rendered.yml

# Expose standard Kong ports
EXPOSE 8000 8443 8001 8444

ENTRYPOINT ["/bin/sh", "/kong/render-kong-config.sh"]

