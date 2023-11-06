Originally published on [my dev.to](https://dev.to/antoinecoulon/avoid-this-when-running-containerized-applications-in-production-562k).

Let's talk about things we **must manage when running containerized applications** and how this relates to proper management of **termination signals**.

Before specifically talking about containers, let's put them aside and see how we run applications on a daily basis. We all use various operating systems that can run huge amount of tasks. These tasks are executed within **processes**, one of the fundamental units of an operating system. 

Consequently each application is assigned to a process that will live until the application properly terminates.

With Node.js, we can check what is the process id currently running our application:

```sh
$ node -e "console.log(process.pid)"
> 39829
```

Overall, one of the core responsabilities of an operating system is to manage the life cycle of these processes, whether they should be created, killed, paused, restarted, etc.

Processes can also interact with other processes, for instance it's pretty common for a parent process to manage a set of child processes to run a multi-process application.

## Termination signals

Termination signals are the primitive used by the OS to tell a specific process to terminate.

On Unix, you can send these termination signals through the **kill** command. 

```sh
$ kill 39829 // SIGTERM by default
$ kill -9 39829 // SIGKILL 
```

There are many [existing termination signals](https://www.gnu.org/software/libc/manual/html_node/Termination-Signals.html) but we'll talk about the three most widely used:

- **SIGTERM**: this is the most common termination signal. This termination is called "soft" because the signal simply orders the process to stop but the process in question can decide to ignore it. This is the signal used by default on Unix OS, when using the `kill` command. This is the equivalent of the OFF button on your remote control.

- **SIGKILL**: this is the most brutal termination signal because it does not allow the target process to react to or ignore the signal. This signal is used to terminate the process immediately and by definition does not allow a graceful shutdown of the application (explained a little further down). It is the equivalent of suddenly unplugging your power cable.

- **SIGINT**: this is the interrupt signal which is for example sent when the user sends CTRL+C command in the terminal currently executing the process.

## Graceful shutdown: one of the main responsabilities of a production-grade application

Now that we know what termination signals are, we could wonder what is the responsibility of the application regarding these signals?

Well, the application itself must properly handle these signals, otherwise there is no room for **graceful shutdown**.

> A **graceful shutdown** for an application refers to a clean and controlled program termination where there is no data loss nor leak of resources and where   the program has the ability to perform other types of critical operations before exiting, such as logging. This is performed by the "Eject" action of a computer drive that allows a clean disconnect. I'm assuming you already know the consequences when doing that 💣.

**How to perform a graceful shutdown?**

Most of the time, process supervisors will first emit signals that are "soft" such as **SIGTERM** or **SIGINT** which don't terminate right away processes.

During a specific period of time (depending on the supervisor), the application process will have time to clean up everything it has to do and then exit i.e. performing the graceful shutdown itself. In other words, graceful shutdown begins with reacting to a termination signal and then trigger application level code to manage the teardown.

```js
// Node.js

// Graceful shutdown on SIGTERM
process.on("SIGTERM", () => {
 // close server, close database connection, write logs...
 releaseAllResources();
 // then manually exit
 process.exit(143);
});
```

As we can see to handle these signals, we can attach process handlers with our own custom logic. Note that it's important for the handler to exit the process manually after the clean up, otherwise the process will hang and still live. 

```js
// Node.js

process.on("SIGTERM", () => {
 // If we don't manually exit, the process will hang forever 
 // until a SIGKILL is fired. Once attaching these types of handler, 
// it's then your responsibility to release the last ressource: the process itself.
});
```

Adding **SIGTERM** process handlers allows us to take control over the logic that will be performed, but we're also responsible to properly exit after that.

> We could also be tempted to not exit after and keep the process running, but this is really disadvised and the handler should only be used for the graceful shutdown itself.

**But can't attaching these handlers be harmful if we don't exit after?**

Of course it can be! This is why most of the supervisors usually don't only rely on **SIGTERM** and after firing **SIGTERM** they wait until a certain period of time and send **SIGKILL** if the process was still not terminated (this is essentially the difference between "Quit" and "Force Quit" when using Task Manager). Note that depending on the OS, some can just let the process hang indefinitely. 

Consequently even applications on your own host machine should properly handle these signals, not only the ones in production, even though the consequences will most likely be less serious and cost less money.

## Production environment

Let's come back on the main, topic, **running containerized applications in production-grade environments**.

> For this article, I consider the fact that you know what a container is. If you don't, please check [Docker's documentation](https://www.docker.com/resources/what-container/) before going deeper into this subject.

## Life cycle of a container

For most production systems, applications will be deployed and run into containers, allowing applications to run in a sandboxed and lightweight environment. There are many different types of containers, but we won't go into these details in this series as most of the good practices and things to avoid can be applied to all types of containers.

Containers are usually managed by supervisors or orchestrators that determine whether a container should be started, restarted, stopped, scaled up/down etc. One of the most famous container orchestrator is [Kubernetes (K8S)](https://kubernetes.io/) originally developed by Google.

The goal of K8S is to orchestrate containers at scale, managing clusters of containers including lot of different services and applications of a company. K8S in a nutshell manages containers deployments, containers life cycles by determining whether they need to be scaled up or down based on the load, but also deals with deployments and when to take arbitrary decision like stop/restart them when new versions of containers are available.

For Kubernetes to be working efficiently, one fundamental criteria for containers has to be respected: **an application running in a container should properly react to signals coming from the orchestrator**.  

**What is the danger of not reacting properly to these signals in the context of containers?**

As it was described in the previous section for OS processes, the supervisor, which is Kubernetes in the context of containers, will first try to send **SIGTERM** and after the default value of 30 seconds (can be customized) is elapsed, a **SIGKILL** signal will be sent to be sure that the container is shut down.

Here a list of container services with their respective behavior with SIGTERM and SIGKILL


|  Service   | Termination signal behavior    |
| --- | --- |
| AWS Elastic Container Service | SIGTERM, wait 30s, then SIGKILL |
| Kubernetes | SIGTERM, wait 30s, then SIGKILL |
| Azure App Service | SIGTERM, wait 30s, then SIGKILL |
Docker | SIGTERM, wait 10s, then SIGKILL |

We could say that it's fine and we don't really care about handling termination signals as the **SIGKILL** will be sent anyway at some point and will terminate both our application process and the container initially hosting the app process.

Putting the **graceful shutdown** process aside that we already explained in the previous section, there is also another problem that can become critical in most production systems, which is **latency**.

Imagine that a container needs to be rollbacked because a bug was introduced, it means that during 30s we won't be able to do anything else but waiting. Also, all operations such as scale down or stop will keep using resources until the **SIGKILL** was fired. At scale on hundreds/thousands of containers, 30s can quickly become a lot of overhead and introduce performance critical penalties.

**Remember to attach termination signal handlers to your applications and handle graceful shutdowns properly. This will help both the application and all the production systems build around it to be more reliable, resilient and effective.**

## Ensure that termination signals can be propagated 

Usually, when your application properly manages terminal signal, it's already a good point. However, there is a prerequisite to that: the termination signal must be propagated correctly starting for the supervisor at the very top to the very bottom where your application process resides.

**What could go wrong?**

Let's take a very simple example with Docker containers, where a `Dockerfile` specifies an **ENTRYPOINT** such that it spawns a shell process as the PID1, known as the **shell form** of the **ENTRYPOINT** command.

**Please don't use the following Dockerfile for shipping Node.js applications in production. This is a simplified example that will pull a deprecated Node.js version (v12) that only suits for educative purposes.**

You can test all the examples that will follow on your own using [the repository I created](https://github.com/antoine-coulon/running-containerized-apps)

`Dockerfile`

```Dockerfile
FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y nodejs

ENTRYPOINT node index.js
```

> Building your own Node.js image is discouraged, here we build it from Ubuntu for educative purposes. Please rely on official images for production.

This will result in two processes in the container, shell being the parent one and the Node.js application being a child process of the shell (subshell). The consequence is that **shell** does not propagate termination signals correctly, meaning that the Node.js process will never receive these signals.

```sh
# Command run within the container

$ ps aux
USER       PID  COMMAND
root         1  /bin/sh -c node index.js
root         7  node index.js
```

Now when we do `docker stop <container-id>` we can see that the Node.js process does not receive the SIGTERM signal and keeps living until Docker sends the SIGKILL signal after 10s.

One way to circumvent that is to avoid shell to be PID1 and turn the application process itself to PID1 using the **exec form** of the ENTRYPOINT.

`Dockerfile`
```Dockerfile
FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y nodejs

ENTRYPOINT ["node", "index.js"]
```

If we run again `ps aux` within the container we can see that the Node.js process is now PID1:

```sh
$ ps aux
USER       PID  COMMAND
root         1  node index.js
```

Because our application follows the good practices we talked about in the first part, it correctly handles signals and is able to perform graceful shutdown.

## Don't let your application process be PID1

The good part of having our application process being the only process in the container and given that our application has setup the expected process handlers is that we are able to properly manage termination signals.

Nonetheless, we have a new problem, which is that our application now is the PID1 also known as init process.

**What is PID1 alias "init" process?**

PID1 or "init" process has very precise responsibilities regarding the operating system (or more precisely in the container in that context).

Before explaining the issue around PID1, let's quickly return to the basis of an OS with the organization of processes.

The process register is represented as a graph, where PID1 represents the root node, commonly called "init".

Unlike other processes, the "init" process (PID1) is assigned very specific responsibilities by the Kernel, which are in particular:

initialize all services (processes) required by the operating system.

manage and reap so-called “zombie” or “orphan” processes. A "zombie" process is a process that has finished executing but for which resources continue to be monopolized.

ensure that child process' exit code is forwarded properly outside of the container.

All of these responsibilities cannot and should not be shouldered by your application nor the runtime your application is being executed on (JVM, Node.js, etc).

**Who should be PID1 then?**

There are a lot of solutions out there but Tini is the most famous and battle-tested one.

Tini has one goal, which is to provide an “init” process that works as expected. It is an independent executable, but it is important to mention that it is embedded by default in Docker since v1.13, usable with `docker run --init` or with docker-compose (v2.2) using `init: true` from the config file for a service.

Still in the context of a Node.js application, here is an example of a minimalist but closer to production-ready Dockerfile using Tini:

```Dockerfile
FROM node:18-alpine

RUN apk add --no-cache tini

# Copy app files

ENTRYPOINT ["/sbin/tini", "--", "node", "index.js"]
```

Hopefully you are now aware of some of the traps that you should avoid when running containerized apps in production and more generally understand the way processes communicate and how supervisors manage their life cycle.

More resources linked to this:

- [Docker and the PID1 problem](https://blog.phusion.nl/2015/01/20/docker-and-the-pid-1-zombie-reaping-problem/)
- [Amazon ECS, how to graceful shutdown](https://aws.amazon.com/blogs/containers/graceful-shutdowns-with-ecs/)
- [Tini, a useful process manager for containerized apps](https://github.com/krallin/tini)

I frequently publish blog posts about software engineering, don't forget to subscribe if you're interested in discovering more!

See you later 👋🏻
