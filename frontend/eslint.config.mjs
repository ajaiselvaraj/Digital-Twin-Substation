import nextConfig from "eslint-config-next"

const config = [
  ...nextConfig,
  {
    ignores: ["backend/ml/model_files/**"],
  },
]

export default config

