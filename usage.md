General jobman command:

jobman [<jobman_options>] [<command>] [<command_options>]

<jobman_options> can be one of the following:

    -v/--version:  optional; prints the version of the application; everything that follows is ignored
    -h/--help:  optional; prints this information; everything that follows is ignored
    -s/--settings <settings_file_path>:  optional; path to a custom settings file

<command> can be one of the following:

    images:  lists all available images that can be used to launch the Kubernetes job with;
    submit:  submits a job to Kubernetes
    list:  lists all existing jobs, including those that ended (successfully or not)
    details:  displays the details of a specific, existing job
    log:  shows the log of a specific, existing job
    delete:  removes a specific, existing job

<command_options> for the submit command can be:

    -i/--image <image_name>:<tag>:  required; the image followed by tag <image_name>:<tag_name> that will be used as the base for the job's container; you can use 
    -j/--job-name <job_name>:  optional; the name of the kubernetes job [default "job.<UUID_generated_at_launch_time>"]
    -e/--enable-gpu:  optional; flag that instructs jobman to launch the job on a node with a GPU [default "false"]
    -t/--cpus <num_cpus>:  optional; set the number of CPUs available to the job [default "1"]
    -m/--memory <memory_size>:  optional; RAM memory allocated to the job; in GB [default "1"]
    --: required; separator between the submit command options and the command passed to the job's container; the parameters that follow the double dash are sent

<command_options> for the details command can be:

    -j/--job-name:  required; the name of the job for which you want to get the details

<command_options> for the log command can be:

    -j/--job-name:  required; the name of the job for which you want to pull the log

<command_options> for the delete command can be:

    -j/--job-name:  required; the name of the job that you want to delete