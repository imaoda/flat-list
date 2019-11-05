import { IConfig } from "umi-types";

const config: IConfig = {
  treeShaking: true,
  history: "hash",
  publicPath: "./",
  theme: { "@primary-color": "#006699" },
  disableCSSModules: true,
  hash: true, // 文件带 hash 后缀
  plugins: [
    [
      "umi-plugin-react",
      {
        antd: false,
        dva: false,
        dynamicImport: { webpackChunkName: true },
        title: "umitpl",
        dll: false,
        define: { "process.env.APP_ENV": "test" },
        routes: {
          exclude: [/components\//],
        },
      },
    ],
  ],
};

export default config;
