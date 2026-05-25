- [x] install.sh 不再使用 本地build docker ,改成 使用 ghcr pull, /home/rainboy/mycode/boxtest-opencode-dev/ 这个项目(judge_server) 也已经改用的 ghcr

## 2026 5 25

- [x] 前端不使用cdn 资源, 全部下载的本地,目的是可以在没有外围的内网使用
- [x] 注册页面
    - [x] 性别 男 女 radio
    - [x] 年级 select ,年级有admin 后台设定 范围 ,1 - 9年级, 高一 高二 高三, 等等,可以有管理员填写哪些出 enable 可选的年级 
    - [x] 班级 数字
    - [x] 管理员后台可以重置 用户的密码 ,删除用户 等
    - [x] 用户可以自己更改密码(在个人中心)
