General jobman command:

jobman [`<jobman_options>`] [`<command>`] [`<command_options>`]

`<jobman_options>` can be one of the following:
    -v/--version:  optional; prints the version of the application; everything that follows is ignored
    -h/--help:  optional; prints this information; everything that follows is ignored
    -s/--settings <settings_file_path>:  optional; path to a custom settings file

`<command>` can be one of the following:
    images:  lists all available images on Harbor that can be used to launch the Kubernetes job with;
    image-details:  obtains the associated description for an image on Harbor;
    submit:  submits a job to Kubernetes
    list:  lists all existing jobs, including those that ended (successfully or not)
    details:  displays the details of a specific, existing job; it outputs a JSON with all the information held by Kubernetes about a specific job, including its detailed status and  information about the underlying pod.
    log:  shows the log of a specific, existing job
    delete:  removes a specific, existing job

`<command_options>` for the **image-details** command can be:
    -i/--image <image_name>:  required; the image name which you want to get the description for from Harbor

`<command_options>` for the **submit** command can be:
    -i/--image <image_name>:<tag>:  required; the image name followed by a valid tag that will be used as the base for the job's container
    -j/--job-name <job_name>:  optional; the name of the kubernetes job [default "job-<UUID_generated_at_launch_time>"]
    -r/--resources <resources_flavor_name>: required/optional; either a JSON string with the definition of a resources flavor, or a path to a JSON file containing a resources flavor, or a name of a predefined resources flavor already defined in the application's settings 
    --: required; separator between the submit command options and the command passed to the job's container; the parameters that follow the double dash are sent

`<command_options>` for the **details** command can be:
    -j/--job-name <job_name>:  required; the name of the job for which you want to get the details; 
    
`<command_options>` for the **log** command can be:
    -j/--job-name <job_name>:  required; the name of the job for which you want to pull the log

`<command_options>` for the **delete** command can be:
    -j/--job-name <job_name>:  required; the name of the job that you want to delete