创建一个install.sh,用来一键安装,

- 执行`./install.sh` 就可以一键安装
 - 提醒用户需要sudo权限
- 拉去仓库代码
  - 仓库1 : /home/rainboy/mycode/boxtest-opencode-dev, https://github.com/rainboyOJ/judge_server_cpp.git
  - 仓库2 : 本仓库, https://github.com/rainboyOJ/roj2.git

- 进行 Dockerfile build
- 完善 docker-compose.yaml
- 执行docker-compose up -d
