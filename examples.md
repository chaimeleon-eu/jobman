
Checkout jobman source code, releases, and documentation at: `https://github.com/chaimeleon-eu/jobman`


Usage examples:
```
  jobman images
  jobman image-details -i ubuntu-python
  jobman submit -i ubuntu-python -j job1 -r no-gpu -- python persistent-home/myScript.py
  jobman list
  jobman logs -j job1
  jobman delete -j job1
  jobman submit -i ubuntu-python:latest-cuda -r small-gpu -- nvidia-smi
```
Type `jobman --help` to see a  list of supported commands and more.