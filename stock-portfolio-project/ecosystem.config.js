// module.exports = {
//   apps: [
//     {
//       name: "backend",
//       script: "cmd",
//       args: "/c evn\\Scripts\\python backend\\manage.py runserver 0.0.0.0:8000",
//       cwd: "./"
//     },
//     {
//       name: "frontend",
//       script: "cmd",
//       args: "/c npm run dev",
//       cwd: "./frontend"
//     }
//   ]
// };

module.exports = {
  apps: [
    {
      name: "backend",
      script: "./evn/Scripts/python.exe",
      args: "backend/manage.py runserver 0.0.0.0:8000",
      cwd: "./"
    },
    {
      name: "frontend",
      script: "cmd",
      args: "/c npm run dev",
      cwd: "./frontend"
    }
  ]
};