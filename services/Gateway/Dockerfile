FROM kong:3

# Copy declarative configuration
COPY kong.yml /kong/kong.yml

# Use the bundled nginx user
USER root

# Set Kong to run in DB-less mode with the provided config
ENV KONG_DATABASE=off \
    KONG_DECLARATIVE_CONFIG=/kong/kong.yml

# Expose standard Kong ports
EXPOSE 8000 8443 8001 8444

# Use default entrypoint/cmd from base image
