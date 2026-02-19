# Documentation

The documentation for `@stewpot/feeds` covers more in-depth and advanced topics
such as running the cli reader as a system service.

You can start the reader anytime by executing
`deno run -RWNE jsr:@stewpot/feeds/cli reader` in your terminal. By creating a
system service, you can access the web interface anytime you want, without
having to execute the `reader` command everytime you want to be able to
read/consume feeds you have subscribed to.

# Run CLI reader as system service with caddy web server (WSL/Linux)

Instructions for installing caddy, are
[available at the caddy website](https://caddyserver.com/docs/install).

You'll also want to check out the documentation for
[running caddy as a system service](https://caddyserver.com/docs/running).
[Here
is the officially recommended system service file](https://github.com/caddyserver/dist/blob/master/init/caddy.service)
for caddy on Linux systems with systemd. There is also documentation for
[setting up a system service on Windows](https://caddyserver.com/docs/running#windows-service),
but that wont be covered in this guide.

Once caddy is installed and running as a system service, add whatever domains
you want to serve in the `Caddyfile` at `/etc/caddy/Caddyfile`. If you don't
have any domains, or don't want to serve the application publicly, you can use
the `.localhost` suffix.

The cli reader app is running on port 8000. By specifying port `443` we get
https automatically thanks to caddy. This is a minimal working configuration for
caddy might look like.

```
# /etc/caddy/Caddyfile

feeds.localhost:443 {
        reverse_proxy http://localhost:8000
}
```

Next, set up a system service for the cli reader app at `/etc/systemd/system`,
you can name the file whatever you want, `feeds.service` for example. Keep in
mind that you'll need to add `.deno/bin` to PATH, otherwise the service wont be
able to run the server.

```
[Unit]
Description=@stewpot/feeds
After=network.target

[Service]
User=linux # user account
Environment="PATH=/home/linux/.deno/bin:$PATH"
# if deno is installed in the user home directory
ExecStart=/home/linux/.deno/bin/feeds reader
# if you've installed the cli as an executable in `~/.deno/bin`, point to where that file is located.
Restart=always

[Install]
WantedBy=multi-user.target
```

Now we have to enable the new service file by running
`sudo systemctl enable feeds.service`. Then run
`sudo systemctl start feeds.service` to start the service.

Last thing to do is to visit `https://feeds.localhost` in a browser. If that is
succesfull you're all set!
