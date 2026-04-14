
# Ignore this if you do not use the fish shell.

sudo systemctl start mongodb.service 
nvm use 22
npm run dev
# Fish will run this even if you hit Ctrl+C on 'npm run dev'
echo "Shutting down..."
sudo systemctl stop mongodb.service 
