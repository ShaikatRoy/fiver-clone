import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { useParams } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { axiosFetch } from '../../utils';
import { CheckoutForm } from '../../components';
import './Pay.scss';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const Pay = () => {
  const { _id } = useParams();
  const [error,setError] = useState();
  const [clientSecret, setClientSecret] = useState('');
  
  useEffect(() => {
    ( async () => {
      try {
        const { data } = await axiosFetch.post(`/orders/create-payment-intent/${_id}`);
        if(data?.error){
          setError(data.message)
          toast.error(data?.message,{duration:4000})
        }
        setClientSecret(data.clientSecret);
      }
      catch(error) {
        console.log(error);
      }
    })();
    window.scrollTo(0, 0)
  }, []);

  const appearance = {
    theme: 'stripe',
  };

  const options = {
    clientSecret,
    appearance,
  };

  return (
    <div className='pay'>
      <h2>Pay Securely with Stripe</h2>
      {
        error && 
        <p>{error}</p>
      }
      {clientSecret && (
        <Elements options={options} stripe={stripePromise}>
          <CheckoutForm />
        </Elements>
      )}
    </div>
  )
}

export default Pay