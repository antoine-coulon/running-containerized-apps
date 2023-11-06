<img src="https://github.com/antoine-coulon/running-containerized-apps/assets/43391199/2ba88460-572d-4043-9c24-3310158b8324">

## Running containerized applications

Please start by reading [BEST-PRACTICES.md](./BEST-PRACTICES.md) which summarizes some of the core principles to respect when running containerized applications.

Originally published on [my dev.to](https://dev.to/antoinecoulon).

## Node.js

All the current examples are using [Node.js](https://github.com/nodejs) but keep in mind that they are valid for most platforms running code.

If anyone is interested in providing other examples for the JVM, Python, Go, Rust... Feel free to submit PRs :) 

To follow the article with examples, you can use the three provided Dockerfile.

- `Docker` needs to be up and running on the host machine.

- Use `./nodejs/docker-build.sh` to build the three images: `node-shell-form`, `node-exec-form`, `node-with-tini`.

- Then just `docker run <image>`.

### `node-shell-form`

1. `docker run node-shell-form`
2. Then access the container `docker exec -it node-shell-form /bin/sh`
3. In the container shell, run `ps aux`
4. Observe `/bin/sh` being PID1
5. Run `docker stop <node-shell-form-container-id>`
6. Observe the Node.js script not receiving the SIGTERM signal hence keeping running until Docker sends SIGKILL after 10 seconds.

### `node-exec-form`

1. `docker run node-exec-form`
2. Then access the container `docker exec -it <node-exec-form-container-id> /bin/sh`
3. In the container shell, run `ps aux`
4. Observe `Node.js` being PID1
5. Run `docker stop <node-exec-form-container-id>`
6. Observe the Node.js script receiving the SIGTERM signal hence allowing the graceful shutdown 

### `node-with-tini`

1. `docker run node-with-tini`
2. Then access the container `docker exec -it <node-with-tini-container-id> /bin/sh`
3. In the container shell, run `ps aux`
4. Observe `Tini` being PID1
5. Run `docker stop <node-with-tini-container-id>`
6. Observe Tini receiving the SIGTERM signal and forwarding it to Node.js hence allowing the graceful shutdown 




