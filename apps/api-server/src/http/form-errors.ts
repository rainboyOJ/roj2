export function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function loginErrorMessage(message: string) {
  if (message.includes('invalid username or password')) {
    return '用户名或密码错误。';
  }
  return '登录失败，请检查用户名和密码后重试。';
}

export function registerErrorMessage(message: string) {
  if (message.includes('username already exists')) {
    return '用户名已存在。';
  }
  if (message.includes('grade') && message.includes('not available')) {
    return '请选择可用的年级。';
  }
  if (message.includes('class') && message.includes('not available')) {
    return '请选择可用的班级。';
  }
  return '注册失败，请检查填写内容后重试。';
}

export function passwordErrorMessage(message: string) {
  if (message.includes('current password')) {
    return '当前密码错误。';
  }
  return '修改密码失败，请检查后重试。';
}
