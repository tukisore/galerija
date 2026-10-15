# The same tools as in development: Ubuntu's OpenJDK 21 and Scala CLI, running the server with scala-cli run.
FROM ubuntu:24.04

RUN apt-get update \
  && apt-get install -y --no-install-recommends openjdk-21-jdk-headless curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# the x86-64 Linux build of Scala CLI
ARG SCALA_CLI_VERSION=1.17.1
RUN curl -fsSL "https://github.com/VirtusLab/scala-cli/releases/download/v${SCALA_CLI_VERSION}/scala-cli-x86_64-pc-linux.gz" \
    | gunzip > /usr/local/bin/scala-cli \
  && chmod +x /usr/local/bin/scala-cli

WORKDIR /app
COPY . .
# compiled now, with the dependencies downloaded, so starting the container does not wait for it
RUN scala-cli compile . --server=false --jvm system

ENV HOST=0.0.0.0
EXPOSE 8080
CMD ["scala-cli", "run", ".", "--main-class", "Main", "--server=false", "--jvm", "system"]
