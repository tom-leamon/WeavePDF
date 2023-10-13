import dynamic from 'next/dynamic';

const DynamicApp = dynamic(() => import('../App'), {
  ssr: false,
});

const Home: React.FC = () => {
  return <DynamicApp />;
};

export default Home;
