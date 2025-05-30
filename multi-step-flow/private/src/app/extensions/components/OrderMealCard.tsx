import React, { useCallback, useEffect, useState } from 'react';
import {
  hubspot,
  Divider,
  LoadingSpinner,
  ErrorState,
  Text,
  Button,
  Flex,
} from '@hubspot/ui-extensions';
import { Cart } from './Cart';
import type { CartItem, OrderMealProps, Restaurant } from '../types';
import { RestaurantsSearch } from './RestaurantsSearch';
import { Checkout } from './Checkout';

export const OrderMealCard = ({
  fetchCrmObjectProperties,
  closeOverlay,
  sendAlert,
}: OrderMealProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [restaurants, setRestaurants] = useState<Array<Restaurant>>([]);
  const [cart, updateCart] = useState<Array<CartItem>>([]);
  const [contactName, setContactName] = useState('');

  // Make a memoized fetch function that handles error and loading state
  // Reusable for both initial card load and retry in case of error
  const getRestaurants = useCallback(() => {
    setLoading(true);
    setError(false);
    // Fetch a list of restaurants and their menus from our serverless function
    hubspot
      .serverless('restaurants')
      .then(async (response) => {
        // Make sure the response is the shape we expect (array of Restaurants)
        if (!Array.isArray(response)) {
          throw new Error('Response is not an array.');
        }

        const restaurants = response.map((restaurant: unknown) => {
          if (
            typeof restaurant !== 'object' ||
            Array.isArray(restaurant) ||
            restaurant === null
          ) {
            throw new TypeError('Object is not a Restaurant');
          }

          return restaurant as Restaurant;
        });

        setRestaurants(restaurants);
      })
      .catch((error) => {
        console.error(error.message);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    getRestaurants();
    fetchCrmObjectProperties(['firstname']).then(({ firstname }) => {
      setContactName(firstname);
    });
  }, []);

  const handleAddToCartClick = useCallback((item: CartItem) => {
    updateCart((items: Array<CartItem>) => [...items, item]);
  }, []);

  const handleRemoveClick = useCallback((id: number) => {
    updateCart((items: Array<CartItem>) =>
      items.filter((item) => item.id !== id)
    );
  }, []);

  const handleCheckoutClick = useCallback(
    (message: string) => {
      sendAlert({
        type: 'success',
        message: `Nicely done! The meal is on its way to ${contactName} with the message: "${message}"`,
      });
      updateCart([]);
    },
    [contactName]
  );

  if (error) {
    return (
      <ErrorState title="Unable to fetch restaurants">
        <Text>Please wait a moment and try again.</Text>
        <Button onClick={getRestaurants}>Retry</Button>
      </ErrorState>
    );
  }

  if (loading) {
    return (
      <LoadingSpinner layout="centered" label="Loading..." showLabel={true} />
    );
  }

  // Small utility function for help below
  const getRestaurant = (id?: number) => {
    return restaurants.find((r) => r.id === id);
  };

  const uniqueRestaurants = new Set(cart.map((item) => item.restaurantId));
  const totalDeliveryCost = [...uniqueRestaurants].reduce((total, id) => {
    return total + (getRestaurant(id)?.deliveryCost ?? 0);
  }, 0);

  const subtotal = cart.reduce((total, item) => total + item.price, 0);

  return (
    <Flex direction="column" gap="md">
      <Text variant="microcopy">
        This example shows you how many components work together to build a
        multi-step flow. This card lets you send a meal from a local restaurant
        to one of your contacts.
      </Text>
      <RestaurantsSearch
        closeOverlay={closeOverlay}
        contactName={contactName}
        restaurants={restaurants}
        addToCart={handleAddToCartClick}
      />
      <Divider />
      <Cart cart={cart} onRemoveClick={handleRemoveClick} />
      {cart.length > 0 && (
        <Checkout
          subtotal={subtotal}
          deliveryCost={totalDeliveryCost}
          onCheckoutClick={handleCheckoutClick}
        />
      )}
    </Flex>
  );
};
