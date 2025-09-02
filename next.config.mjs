import withNextIntl from 'next-intl/plugin';

const withNextIntlConfig = withNextIntl();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // You can add other Next.js configurations here if you have them
};

export default withNextIntlConfig(nextConfig);