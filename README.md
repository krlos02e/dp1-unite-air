## Clone Repository
``` bash
git clone --recurse-submodules https://github.com/Krlos02E/dp1-unite-air.git
git submodule update --init --recursive
git submodule foreach git checkout main
git submodule foreach git pull
```