FROM ubuntu:19.10

RUN apt-get update && apt-get upgrade

RUN apt-get install -y npm 
RUN apt-get install -y node

RUN mkdir /usr/local/chat
COPY . /usr/local/chat

WORKDIR /usr/local/chat

#for test
RUN ls -la

EXPOSE 3000

CMD ["node", "server.js"]
