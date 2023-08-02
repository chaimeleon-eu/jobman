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

## Resources flavors

**jobman** allows the user to define the resources needed for a job using a JSON structure like the following:

{
    "name"<Required>: <the actual name of the flavor, must be unique when multiple flavors defined>
    "resources"<Required>: {
        "requests"<Required>: <a JSON object with the same structure as one used by kubernetes for the requests section>
        "limits"<Optional>: <a JSON object with the same structure as one used by kubernetes for the limits section>
    }
}

Flavors can be used by passing them as a command line argument for the **submit** command (check [usage.md](usage.md)).
You can store a list of predefined flavors directly in the settings file, along with a default one that is used whenever no argument is passed with the **submit** command.

Do not include private/sensitive information in the name of a flavor.
It can be seen by others in the cluster.

No gpu example with both requests and limits:

```
{
    "name": "no-gpu"
    "resources": {
        "requests": {
            "cpu": "1000m",
            "memory": "1G"
        },
        "limits": {
            "cpu": "1000m",
            "memory": "1G"
        },
    }
}
```

One Nvidia GPU without limits example 

```
{
    "name": "large-gpu"
    "resources": {
        "requests": {
            "cpu": "1000m",
            "memory": "1G",
            "nvidia.com/gpu": 1
        }
    }
}
```

## Workflow and examples

**jobman** can perform multiple operations related to Kubernetes job execution.
Check the full description of comand line arguments in the [usage.md](usage.md) file.

### Check the images on Harbor

If you have a Harbor instance deployed to manage the images you use on Kubernetes, you can check the available images and their tags using the **images** command:

```jobman images```

### Obtain the description of an image on Harbor

You can get the description of an image stored on Harbor using the **image-details** command. 
You have to specify the image name using the **-i** or **--image** argument following the command. 
The tag of the image is not required, as Harbor stores the description per image not per image/tag combo.

```jobman image-details -i ubuntu_python_tensorflow```

### List the Kubernetes jobs queue

If you want to see how many jobs with a certain requests configuration are active (waiting in the queue or already running), you can use the **queue** command.
Currently, there is no distinction between different extend resources for GPUs.
Therefore, you have have both Nvidia and AMD, defined by the keys "nvidia.com/gpu" and "amd.com/gpu" respectively, and you launch a job requesting both, **jobman** will sum their count and display it.
You can use flavors to separate various configurations of the resources.

Be careful when launching with your own flavors.
If the name of the flavor is not unique, it can create conflicts within the platform.
Should you name your flavor like an existing, predefined, cluster-wide available flavor, the platform may replace your actual resources configuration with a predefined one.
This normally happens in a cluster that uses a specially defined Kubernetes operator to filter the jobs sent to the Kubernetes queue, and it is part of the security of multi-user environments.
**jobman** cannot know what other flavors + resources configurations are available on other machines, therefore it doens't have the ability to stop you from using a name already in use by someone else for a different resources configuration.
Conflicting flavor names + resources configurations result in the group algorithm of the **queue** command to report in erroneous information.

The output is a table showing:

- how many jobs with a certain resources configuration are curently active
- how many of those jobs are yours
- what resources configuration are those jobs requesting
- which flavor are they using for their resources configuration (if any, __<no name>__ means the launched jobs' resources configuration has no name defined)

```jobman queue```

### Submit jobs
To actually deploy a job on the Kubernetes cluster, use the **submit** command.
The application' settings include a default image name/tag used if the -i/--image argument is not present.

Do not include private information in the name of the jobs, they can be viewed by others.

- let's list the directories in the root of the job's container; we use the alpine:latest image, since we don't pass a full path to the image, Kubernetes assumes the default repository; for this job, we use a resources flavor without GPU support named "no-gpu"; the -- argument separates the command's arguments from those sent as a command to the job's container

```jobman submit -i alpine -r no-gpu -- ls -al /```

- list the available GPUs in a pod launched with GPU support, using the `nvidia-smi` utility; for this job, we use a resources flavor with GPU support named "small-gpu"

```jobman submit -i ubuntu_python_tensorflow:3.1cuda11 -r small-gpu -- sh -c 'nvidia-smi -L'```

- suppose you want to launch something more complex, such as a tensorflow application that needs a gpu using an image called __ubuntu_python_tensorflow:3.1cuda11__; for this job, we use a resources flavor with GPU support named "large-gpu"

```jobman submit -i ubuntu_python_tensorflow:3.1cuda11 -r large-gpu -- python3 -c "exec(\"from tensorflow.python.client import device_lib\ndevice_lib.list_local_devices()\")"```


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
Let's call it a remote development deployment.
It is a basic GUI environment with some preinstalled packages (such as python).
To connect to it, the users have to use Guacamole, a clientless remote desktop gateway accessible through a browser.
Guacamole allows uploads, but no downloads, therefore the necessary external source code and/or additional files can be added to the remote development deployment.
The uploaded material can be edited/used directly on the remote.
For the actual execution of algorithms, the users should employ **jobman**, which was developed for launching heavy computational workloads as Kubernetes jobs.
The remote development deployment is not meant to do the heavy lifting, it's for editing code, maybe some light runs to see if the code actually works. 

When enabled, **jobman** mounts the following directories in a job's container:

- __/home/chaimeleon/persistent-home__: your private folder that stores the data across executions of the various tools in the Kubernetes cluster
- __/home/chaimeleon/persistent-shared-folder__: the shared folder for all users, when you need to share (read, or read-write) data with the rest of the users on the platform
- __/home/chaimeleon/datasets/*__: the directory containing the mounted datasets

These folders' content and the paths themselves are exactly the same as they are on each user's remote development deployment. 



