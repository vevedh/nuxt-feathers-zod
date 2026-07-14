services:
  mongodb:
    image: mongo:7
    container_name: nfz-mongodb
    restart: unless-stopped
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGODB_ADMIN:-admin}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGODB_PASSWORD:-changeme}
    ports:
      - "27017:27017"
    volumes:
      - nfz_mongodb_data:/data/db

volumes:
  nfz_mongodb_data:
