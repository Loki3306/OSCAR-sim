# Stage 1: Build Environment
FROM rust:1.80 AS builder
WORKDIR /app

# Copy the dependency manifests
COPY Cargo.toml ./

# Create a dummy src to compile dependencies and cache them
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
RUN rm -rf src

# Now copy the actual source code and build
COPY src ./src
# Touch the file to ensure cargo notices the change
RUN touch src/main.rs
RUN cargo build --release

# Stage 2: Runtime Environment
FROM debian:bookworm-slim
WORKDIR /app

# Install curl for local Phase 1 debugging/healthchecks
RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from the builder stage
COPY --from=builder /app/target/release/oscar-api /app/oscar-api

# Default API_PORT is 3000
EXPOSE 3000

CMD ["/app/oscar-api"]
