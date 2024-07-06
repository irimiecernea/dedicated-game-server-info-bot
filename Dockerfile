# Use the official Node.js 18 image as the base image
FROM node:18

# Create and set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json files to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the rest of the bot's source code to the working directory
COPY . .

# Define the command to run the bot
CMD ["node", "bot.js"]
