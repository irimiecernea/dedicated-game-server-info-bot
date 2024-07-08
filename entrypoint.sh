#!/bin/sh

# Copy the app files to the host if the target directory is empty
if [ -z "$(ls -A /usr/src/app)" ]; then
  cp -R /tmp/app/* /usr/src/app/
fi

# Execute the original CMD
exec "$@"