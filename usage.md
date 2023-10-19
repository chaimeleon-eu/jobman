General jobman command:

jobman [`<jobman_options>`] [`<command>`] [`<command_options>`]

`<jobman_options>` can be one of the following:
    -v/--version:  optional; prints the version of the application; everything that follows is ignored
    -h/--help:  optional; prints this information; everything that follows is ignored
    -s/--settings <settings_file_path>:  optional; path to a custom settings file

`<command>` can be one of the following:
    images:  lists all available images on Harbor that can be used to launch the Kubernetes job with
    image-details:  obtains the associated description for an image on Harbor
    queue: lists information regarding the kubernetes jobs queue, grouped by flavors/requests
    submit:  submits a job to Kubernetes
    list:  lists all existing jobs, including those that ended (successfully or not)
    details:  displays the details of a specific, existing job; it outputs a JSON with all the information held by Kubernetes about a specific job, including its detailed status and  information about the underlying pod
    log:  shows the log of a specific, existing job
    delete:  removes a specific, existing job
    resources-flavors: lists the predefined resources flavors available in the application's settings files

`<command_options>` for the **image-details** command can be:
    -i/--image <image_name>:  required; the image name which you want to get the description for from Harbor

`<command_options>` for the **submit** command can be:
    -i/--image <image_name>:<tag>:  required/optional*; the image name followed by a valid tag that will be used for the job; *optional when a default value appears in settings
    -j/--job-name <job_name>:  optional; the name of the kubernetes job ["job-<UUID_generated_at_launch_time>"]
    -r/--resources-flavor <resources_flavor_name>: required/optional*; either a JSON string with the definition of a resources flavor, or a path to a JSON file containing a resources flavor, or a name of a predefined resources flavor already defined in the application's settings; *optional when there is a default flavor name set in the application settings
    -c/--command: optional; flag; If added and extra arguments are present after '--', use them as the 'command' field in the Kubernetes job's container (or EntryPoint in Docker), rather than the 'args' field (or CMD in Docker) which is the default [false]
    --dry-run: optional; flag; if set the job is not sent to Kubernetes, its content is dumped on the screen [false]
    --: required/optional*; separator between the submit command options and the command or args passed to the Kubernetes job; the string that follows the double dash are sent to the Kubernetes job either as args or as command (if the 'command' flag is used); *optional when you don't want to pass command/args to the Kubernetes job

`<command_options>` for the **details** command can be:
    -j/--job-name <job_name>:  required; the name of the job for which you want to get the details; 
    
`<command_options>` for the **log** command can be:
    -j/--job-name <job_name>:  required; the name of the job for which you want to pull the log

`<command_options>` for the **delete** command can be:
    -j/--job-name <job_name>:  required/disallowed*; the name of the job that you want to delete; *disallowed when "--all" passed
    --all: required/disallowed*; removes ALL jobs (independ of their status), required when "--job-name" not specified, *disallowed when the aforementioned is set