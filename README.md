# jobman
The Kubernetes job manager

## Installation

**jobman** is written in Typescript and uses Node.
Follow the next steps to download and compile the application.

- Be sure you have node installed on your system
- Clone the github repo on your computer, a __jobman__ directory should be created with the sources inside, which we call the JOBMAN_ROOT from now on
- Install the needed libraries, run the following command inside JOBMAN_ROOT; a new folder __node_modules__ should be created, where all dependencies are downloaded from the npm online registry

```npm install```

- Compile the typescript code into javascript using the next command inside JOBMAN_ROOT, a folder __dist__ should appear with the javascript code 

```npx tsc```

- Run the app using the script in the JOBMAN_ROOT/__bin__ directory; it should print the version of **jobman** on the console

```bin/jobman```

## Settings

**jobman** uses a json settings file. 
We include a template with the source code.
This template is used by default by the application.
You can customize it directly, just be sure to modify the one in the __dist__ directory, not the one in __src__.

A second way to customize the settings is to create a __.jobman/settings.json__ in the user's home directory.
The values found in this file override those found in the template.

Finally, you can pass a path to a __settings.json__ file on the command line using the -s/--settings argument.
Check the full description of comand line arguments in the [usage.md](usage.md) file.

## Workflow and examples

**jobman** can perform multiple operations related to Kubernetes job execution.
Check the full description of comand line arguments in the [usage.md](usage.md) file.

### Check the images on Harbor

If you have a Harbor instance deployed to manage the images you use on Kubernetes, you can check the available images and their tags using the **images** command:

```jobman images```

### Submit jobs
To actually deploy a job on the Kubernetes cluster, use the **submit** command.
The application' settings include a default image name/tag used if the -i/--image argument is not present.

- let's list the directories in the root of the job's container; we use the alpine:latest image, since we don't pass a full path to the image, Kubernetes assumes the default repository; the -- argument separates the command's arguments from those sent as a command to the job's container

```jobman submit -i alpine -- ls -al /```

- now suppose you want to launch something more complex, such as a tensorflow application that needs a gpu using an image called __ubuntu_python_tensorflow:3.1cuda11__; pass the -e/--enable-gpu flag to request a GPU

```jobman submit -i ubuntu_python_tensorflow:3.1cuda11 -- python3 -c "exec(\"from tensorflow.python.client import device_lib\ndevice_lib.list_local_devices()\")"```


### List existing jobs

When you want to see what jobs you already launched on Kubernetes, and some additional info such as their status, use the **list** command.
The most important part is the name of the job since it is needed when doing specific operations like getting the log.
This command

```jobman list```

### Get logs

If you want to get the Kubernetes logs for a specific job, you can use the **log** command that requires the -j/--job-name argument followed by the job name.
To get the job name, check the output of the **submit** command or call **list**.


```jobman log -j <job_name>```

### Delete a job

If you want to completely remove a job from the Kubernetes cluster, use **delete** followed by the -j/--job-name argument and of course the actual name of the desired job.

```jobman delete -j <job_name>```

### Get details of a job

When you need more details of a specific job, use the **details** command followed by the -j/--job-name argument and of course the actual name of the desired job.

```jobman details -j <job_name>```

## Data (CHAIMELEON setup only)

In CHAIMELEON, we use a two step setup for our users who wish to launch heavy computational workloads.
First, they have to launch an application through KubeApps.
Let's call it development deployment.
it is a basic GUI environment based on Ubuntu with some tools preinstalled and of course, **jobman**.
To connect to it, one has to go through Guacamole.
Our users can upload the necessary source code and/or additional files and start preparing the actual launch directly on this deployment.
Once everything is ready, **jobman** allows the launching of jobs that run the actual heavy computational workload.
The development deployment is not meant to do the heavy lifting, it's for editing code, maybe some simple runs to see if the code actually works. 

When enabled, **jobman** mounts the following directories into the job's container:

- __/home/chaimeleon/persistent-home__: your private folder that stores the data across executions of the various tools in the Kubernetes cluster
- __/home/chaimeleon/persistent-shared-folder__: the shared folder for all users, when you need to share (read, or read-write) data with the rest of the platform's users
- __/home/chaimeleon/datasets/*__: the directory containing the mounted datasets

These folders' content is exactly the same as it is on your deployment's environment. 
These paths are exactly the same both in the development environment and the job itself.
This is how you can share code and data between the two steps. 



